import {PDFDocument, StandardFonts, concatTransformationMatrix, popGraphicsState, pushGraphicsState, rgb, type PDFFont, type PDFImage, type PDFPage} from "pdf-lib";
import JSZip from "jszip";
import {raContributions} from "../model/raContributions.ts";
import {adjustmentTexts, jointComment, jointFootnote, type JointModuleResult, type JointStudent} from "../model/joint.ts";
import {moduleComment} from "../model/moduleComment.ts";
import {PROJECTED_NOTE, summarizeStudent, type StudentSummary, type SummaryStatus} from "../model/studentSummary.ts";
import type {AcademicCourse, Group} from "../model/domain.ts";

export {studentEmailLocal, uniquePdfNames} from "./studentFileName.ts";

// ---------------------------------------------------------------------------------------------
// Dibuix
// ---------------------------------------------------------------------------------------------

const A4 = {w: 595.28, h: 841.89}, MARGIN = 40, BOTTOM = 46, CW = A4.w - 2 * MARGIN;
const hex = (c: string) => rgb(parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255);
const n2 = (v: number) => v.toLocaleString("ca", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const pct = (v: number) => `${Math.round(v * 100)} %`;
const listJoin = (items: string[]) => items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} i ${items[items.length - 1]}`;

const STATUS: Record<SummaryStatus, {bg: string; fg: string; label: string}> = {
  superat: {bg: "#dff3e4", fg: "#1d6b48", label: "Superat de moment"},
  "no-superat": {bg: "#f9dcdc", fg: "#a12f40", label: "No superat de moment"},
  pendent: {bg: "#e6eefc", fg: "#2f5fb3", label: "Pendent d'avaluar"},
};
const RA_STATE = {
  assolit: {bg: "#dff3e4", fg: "#1d6b48", label: "Assolit"},
  "no-assolit": {bg: "#f9dcdc", fg: "#a12f40", label: "No assolit"},
  "en-curs": {bg: "#e6eefc", fg: "#2f5fb3", label: "En curs"},
} as const;
const STATE_LABEL = {superat: "Superat de moment", "no-superat": "No superat de moment", pendent: "Pendent d'avaluar", absent: "—"} as const;
const STATE_COLOR = {superat: "#1d6b48", "no-superat": "#a12f40", pendent: "#2f5fb3", absent: "#6b7a92"} as const;
const gradeColor = (g: number) => g >= 7 ? "#22a06b" : g >= 5 ? "#e0a31a" : "#d64558";

const REPLACEMENTS: Record<string, string> = {"≥": ">=", "≤": "<=", "→": "->", "●": "•", "✎": "*", " ": " ", "\t": " ", "\n": " "};

class Doc {
  readonly texts: string[] = [];
  page!: PDFPage;
  /** Factor d'escala uniforme de les pàgines noves (com el «zoom» de la impressió). */
  k = 1;
  W = A4.w;
  H = A4.h;
  CW = A4.w - 2 * MARGIN;
  /** Pàgines amb la transformació d'escala activa (cal tancar-la abans del peu). */
  private scaled = new Set<PDFPage>();
  /** Distància des de dalt de la pàgina fins al cursor. */
  t = MARGIN;
  readonly pdf: PDFDocument;
  readonly font: PDFFont;
  readonly bold: PDFFont;
  readonly italic: PDFFont;
  readonly logo: PDFImage | null;
  private supported: Set<number>;
  constructor(pdf: PDFDocument, font: PDFFont, bold: PDFFont, italic: PDFFont, logo: PDFImage | null) {
    this.pdf = pdf; this.font = font; this.bold = bold; this.italic = italic; this.logo = logo;
    this.supported = new Set(font.getCharacterSet());
  }
  static async create(logoBytes?: Uint8Array | null): Promise<Doc> {
    const pdf = await PDFDocument.create();
    const [font, bold, italic] = await Promise.all([pdf.embedFont(StandardFonts.Helvetica), pdf.embedFont(StandardFonts.HelveticaBold), pdf.embedFont(StandardFonts.HelveticaOblique)]);
    const logo = logoBytes ? await pdf.embedPng(logoBytes) : null;
    const doc = new Doc(pdf, font, bold, italic, logo);
    doc.newPage();
    return doc;
  }

  /** Les pàgines que es creïn a partir d'ara es dibuixen amb aquest factor (la pàgina virtual és més gran i es redueix). */
  setScale(k: number): void { this.k = k; this.W = A4.w / k; this.H = A4.h / k; this.CW = this.W - 2 * MARGIN; }
  newPage(): void {
    this.page = this.pdf.addPage([A4.w, A4.h]);
    this.page.pushOperators(pushGraphicsState(), concatTransformationMatrix(this.k, 0, 0, this.k, 0, 0));
    this.scaled.add(this.page);
    this.t = MARGIN;
  }
  ensure(height: number): void { if (this.t + height > this.H - BOTTOM) this.newPage(); }

  /** Només caràcters que la font estàndard sap codificar (WinAnsi). */
  safe(text: string): string {
    let out = "";
    for (const ch of text) {
      const mapped = REPLACEMENTS[ch] ?? ch;
      for (const c of mapped) out += this.supported.has(c.codePointAt(0)!) ? c : "?";
    }
    return out;
  }
  width(text: string, size: number, font = this.font): number { return font.widthOfTextAtSize(this.safe(text), size); }
  wrap(text: string, maxWidth: number, size: number, font = this.font): string[] {
    const lines: string[] = [];
    let line = "";
    for (const word of this.safe(text).split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(test, size) > maxWidth) { lines.push(line); line = word; } else line = test;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  /** Text a la posició (x, línia base a `baseline` des de dalt). */
  draw(text: string, x: number, baseline: number, size: number, opts: {font?: PDFFont; color?: string; align?: "left" | "right" | "center"; width?: number} = {}): void {
    const font = opts.font ?? this.font, s = this.safe(text);
    if (!s) return;
    this.texts.push(s);
    const w = font.widthOfTextAtSize(s, size);
    const px = opts.align === "right" ? x + (opts.width ?? 0) - w : opts.align === "center" ? x + ((opts.width ?? 0) - w) / 2 : x;
    this.page.drawText(s, {x: px, y: this.H - baseline, size, font, color: hex(opts.color ?? "#1d2b44")});
  }
  rect(x: number, top: number, w: number, h: number, o: {fill?: string; stroke?: string; strokeWidth?: number; radius?: number} = {}): void {
    const y = this.H - top - h;
    if (o.radius && o.radius > 0) {
      const r = Math.min(o.radius, w / 2, h / 2);
      const path = `M${r},0 L${w - r},0 A${r},${r} 0 0 1 ${w},${r} L${w},${h - r} A${r},${r} 0 0 1 ${w - r},${h} L${r},${h} A${r},${r} 0 0 1 0,${h - r} L0,${r} A${r},${r} 0 0 1 ${r},0 Z`;
      this.page.drawSvgPath(path, {x, y: y + h, color: o.fill ? hex(o.fill) : undefined, borderColor: o.stroke ? hex(o.stroke) : undefined, borderWidth: o.stroke ? (o.strokeWidth ?? 0.6) : 0});
    } else this.page.drawRectangle({x, y, width: w, height: h, color: o.fill ? hex(o.fill) : undefined, borderColor: o.stroke ? hex(o.stroke) : undefined, borderWidth: o.stroke ? (o.strokeWidth ?? 0.6) : 0});
  }

  /** Paràgraf amb salt de línia automàtic; avança el cursor. */
  para(text: string, o: {size?: number; font?: PDFFont; color?: string; x?: number; width?: number; after?: number; lineHeight?: number} = {}): void {
    const size = o.size ?? 8.5, x = o.x ?? MARGIN, width = o.width ?? this.CW, lh = o.lineHeight ?? size * 1.32;
    for (const line of this.wrap(text, width, size, o.font)) { this.ensure(lh); this.draw(line, x, this.t + size, size, {font: o.font, color: o.color}); this.t += lh; }
    this.t += o.after ?? 0;
  }

  /** Caixa amb fons i vora que envolta el contingut que dibuixa `body`; l'alçada es mesura abans de dibuixar. */
  box(o: {fill: string; stroke: string; pad?: number; gapAfter?: number}, measure: (w: number) => number, body: (x: number, w: number) => void): void {
    const pad = o.pad ?? 8, inner = this.CW - 2 * pad, h = measure(inner) + 2 * pad;
    this.ensure(h);
    this.rect(MARGIN, this.t, this.CW, h, {fill: o.fill, stroke: o.stroke, radius: 5});
    const start = this.t;
    this.t += pad;
    body(MARGIN + pad, inner);
    this.t = start + h + (o.gapAfter ?? 8);
  }
  /** Alçada que ocuparà un paràgraf. */
  paraHeight(text: string, w: number, size: number, lh = size * 1.32, font?: PDFFont): number { return this.wrap(text, w, size, font).length * lh; }

  chip(text: string, x: number, top: number, bg: string, fg: string, size = 7.5): number {
    const w = this.width(text, size, this.bold) + 12, h = size + 6;
    this.rect(x, top, w, h, {fill: bg, radius: h / 2});
    this.draw(text, x + 6, top + h - 3.4, size, {font: this.bold, color: fg});
    return w;
  }

  logoRow(): void {
    if (!this.logo) return;
    const w = 92, h = (this.logo.height / this.logo.width) * w;
    this.page.drawImage(this.logo, {x: MARGIN, y: this.H - this.t - h, width: w, height: h});
    this.t += h + 4;
  }
  heading(text: string): void {
    this.ensure(26);
    this.draw(text, MARGIN, this.t + 14, 14.5, {font: this.bold, align: "center", width: this.CW});
    this.t += 24;
  }

  /** Peu de pàgina amb el número de cada pàgina. */
  finish(label: string): void {
    const pages = this.pdf.getPages();
    this.setScale(1);
    pages.forEach((page, i) => {
      this.page = page;
      if (this.scaled.has(page)) page.pushOperators(popGraphicsState());
      this.draw(`${label} · pàgina ${i + 1} de ${pages.length}`, MARGIN, this.H - 28, 7, {color: "#8995a7"});
    });
  }
}

// ---------------------------------------------------------------------------------------------
// Pàgines
// ---------------------------------------------------------------------------------------------

const today = (now: Date) => now.toLocaleDateString("ca", {day: "2-digit", month: "2-digit", year: "numeric"});

function head(doc: Doc, o: {title: string; name: string; sub: string; coverage?: number}): void {
  doc.ensure(50);
  doc.draw(o.title, MARGIN, doc.t + 8, 7.5, {font: doc.bold, color: "#4e77c9"});
  doc.draw(o.name, MARGIN, doc.t + 25, 17, {font: doc.bold});
  if (o.coverage !== undefined) {
    const nameW = doc.width(o.name, 17, doc.bold), label = `${Math.round(o.coverage)} %`, w = doc.width(label, 9, doc.bold) + 14;
    doc.rect(MARGIN + nameW + 8, doc.t + 10.5, w, 16, {fill: "#f3f7fe", stroke: "#c9d6ee", radius: 4});
    doc.draw(label, MARGIN + nameW + 8, doc.t + 22, 9, {font: doc.bold, color: "#2f5fb3", align: "center", width: w});
  }
  doc.draw(o.sub, MARGIN, doc.t + 38, 8, {color: "#7d899d"});
  doc.t += 46;
  doc.rect(MARGIN, doc.t, doc.CW, 1.2, {fill: "#e7ecf4"});
  doc.t += 8;
}

function summaryPage(doc: Doc, courses: AcademicCourse[], student: JointStudent, course: AcademicCourse, groupCode: string, now: Date): void {
  doc.logoRow();
  doc.heading(courses.map(c => c.configuration.moduleName).join(" · "));
  head(doc, {title: "INFORME CONJUNT D'AVALUACIÓ DE L'ALUMNE", name: student.name, sub: `${course.configuration.level} · Grup ${groupCode} · ${course.academicYear} · Dades a ${today(now)}`});

  // Taula de mòduls
  const cols = [{h: "Mòdul", w: 118}, {h: "Nota projectada", w: 50}, {h: "Estat", w: 84}, {h: "Avaluat", w: 40}, {h: "RA assolits", w: 76}, {h: "RA no assolits", w: 76}, {h: "RA en curs", w: 71}];
  const pad = 4, size = 7.5;
  const widths = cols.map(c => c.w), total = widths.reduce((a, b) => a + b, 0), k = doc.CW / total;
  const xs: number[] = []; let acc = MARGIN;
  for (const w of widths) { xs.push(acc); acc += w * k; }
  const cell = (i: number, text: string, font = doc.font, color = "#1d2b44", top = doc.t, span = 1) => {
    const w = widths.slice(i, i + span).reduce((a, b) => a + b, 0) * k - 2 * pad;
    const lines = doc.wrap(text, w, size, font);
    lines.forEach((line, n) => doc.draw(line, xs[i] + pad, top + pad + size + n * size * 1.25, size, {font, color}));
    return lines.length;
  };
  doc.ensure(24);
  doc.rect(MARGIN, doc.t, doc.CW, 20, {fill: "#f5f8fc"});
  cols.forEach((c, i) => cell(i, c.h, doc.bold, "#52647c"));
  doc.t += 20;
  for (const m of student.modules) {
    const texts = m.state === "absent" ? [] : [m.projected === null ? "—" : n2(m.projected), STATE_LABEL[m.state], `${m.coverage.toFixed(0)}%`, m.achieved.join(", ") || "—", m.failed.join(", ") || "—", m.inProgress.join(", ") || "—"];
    const lines = Math.max(doc.wrap(m.moduleName, widths[0] * k - 2 * pad, size, doc.bold).length, ...texts.map((t, i) => doc.wrap(t, widths[i + 1] * k - 2 * pad, size).length), 1);
    const h = pad * 2 + size + (lines - 1) * size * 1.25 + 2;
    doc.ensure(h);
    doc.rect(MARGIN, doc.t + h - 0.6, doc.CW, 0.6, {fill: "#edf0f4"});
    cell(0, m.moduleName, doc.bold);
    if (m.state === "absent") cell(1, "No matriculat en aquest mòdul", doc.font, "#8995a7", doc.t, 6);
    else texts.forEach((t, i) => cell(i + 1, t, i === 0 ? doc.bold : doc.font, i === 1 ? STATE_COLOR[m.state] : i === 4 && m.failed.length ? "#a12f40" : "#1d2b44"));
    doc.t += h;
  }
  doc.t += 12;

  const comment = jointComment(student) || "Sense mòduls.";
  doc.box({fill: "#fbfaf3", stroke: "#e4dcc0"}, w => 12 + doc.paraHeight(comment, w, 9, 12), (x, w) => {
    doc.draw("VALORACIÓ GLOBAL", x, doc.t + 7, 7.5, {font: doc.bold, color: "#7d899d"}); doc.t += 12;
    doc.para(comment, {size: 9, x, width: w, lineHeight: 12});
  });
  const adjustments = student.modules.flatMap(m => adjustmentTexts(m).map(t => `${m.abbreviation} · ${t}`));
  if (adjustments.length) doc.box({fill: "#ffffff", stroke: "#dfe5ee"}, w => 12 + adjustments.reduce((s, t) => s + doc.paraHeight(`• ${t}`, w, 8, 10.5) + 2, 0), (x, w) => {
    doc.draw("NOTES DECIDIDES PEL PROFESSOR", x, doc.t + 7, 7.5, {font: doc.bold, color: "#7d899d"}); doc.t += 12;
    for (const t of adjustments) doc.para(`• ${t}`, {size: 8, x, width: w, lineHeight: 10.5, after: 2});
  });
  doc.para(jointFootnote(courses, true), {size: 7.5, color: "#7d899d"});
}

function raBars(doc: Doc, course: AcademicCourse, group: Group, enrollmentId: string, summary: StudentSummary): void {
  const ras = raContributions(course, group, enrollmentId);
  if (!ras.length) return;
  doc.ensure(40);
  doc.draw("RESULTATS D'APRENENTATGE: QUÈ PORTO I QUÈ ME FALTA — CONVOCATÒRIA ORDINÀRIA", MARGIN, doc.t + 8, 7.5, {font: doc.bold, color: "#7d899d"});
  doc.t += 14;
  // llegenda
  let lx = MARGIN;
  for (const [color, label] of [["#22a06b", "Nota alta"], ["#e0a31a", "Aprovat just"], ["#d64558", "Per sota de 5"], ["#eef1f6", "Encara sense nota"], ["#b7c0cf", "No lliurada (0)"]] as const) {
    doc.rect(lx, doc.t + 1, 7, 7, {fill: color, stroke: "#c9d2e0", strokeWidth: 0.4});
    doc.draw(label, lx + 10, doc.t + 7.6, 7, {color: "#52647c"});
    lx += 18 + doc.width(label, 7);
  }
  doc.t += 14;

  const codeW = 58, scoreW = 92, barX = MARGIN + codeW, barW = doc.CW - codeW - scoreW, barH = 12;
  for (const r of ras) {
    const sr = summary.ras.find(q => q.code === r.code), state = sr?.state ?? "en-curs", st = RA_STATE[state];
    const missing = r.parts.filter(p => p.grade === null).reduce((s, p) => s + p.share, 0);
    const hidden = !r.adjusted && !!sr?.requiredFailed;
    const notes: {text: string; color: string}[] = [{text: `${pct(1 - missing)} del ${r.code} ja té nota · queda un ${pct(missing)} per fer`, color: "#7d899d"}];
    if (r.adjusted) notes.push({text: `Nota decidida pel professor (${n2(r.adjusted.value)}; calculada ${n2(r.earned)}): ${r.adjusted.reason}`, color: "#8a5a00"});
    if (state === "no-assolit" && sr?.causes.length) notes.push({text: sr.causes.join("; "), color: "#8f3742"});
    const noteLines = notes.flatMap(n => doc.wrap(n.text, barW - 4, 7).map(text => ({text, color: n.color})));
    const rowH = 10 + barH + 4 + noteLines.length * 9 + 5;
    doc.ensure(rowH);
    const top = doc.t;
    doc.draw(r.code, MARGIN, top + 11, 10, {font: doc.bold});
    doc.chip(st.label, MARGIN, top + 14, st.bg, st.fg, 6.5);
    let desc = doc.safe(r.description);
    while (desc.length > 4 && doc.width(desc, 7) > barW - 4) desc = desc.slice(0, -2);
    if (desc !== doc.safe(r.description)) desc = `${desc.trimEnd()}…`;
    doc.draw(desc, barX, top + 7, 7, {color: "#7d899d"});
    // barra: un bloc per tasca, l'ample és el pes dins l'RA
    const barTop = top + 11;
    let x = barX;
    const shareTotal = r.parts.reduce((s, p) => s + p.share, 0) || 1;
    doc.rect(barX, barTop, barW, barH, {fill: "#f1f4f9", stroke: "#d6deeb", radius: 3});
    for (const p of r.parts) {
      const w = (p.share / shareTotal) * barW;
      if (p.grade === 0) doc.rect(x, barTop, w, barH, {fill: "#b7c0cf"});
      else if (p.grade !== null) doc.rect(x, barTop + barH * (1 - Math.min(10, p.grade) / 10), w, barH * Math.min(10, p.grade) / 10, {fill: gradeColor(p.grade)});
      doc.rect(x, barTop, w, barH, {stroke: "#ffffff", strokeWidth: 0.8});
      x += w;
    }
    doc.rect(barX, barTop, barW, barH, {stroke: "#cfd8e6", strokeWidth: 0.5, radius: 3});
    noteLines.forEach((n, i) => doc.draw(n.text, barX, top + 11 + barH + 8 + i * 9, 7, {color: n.color}));
    // nota de l'RA, a la dreta
    const sx = doc.W - MARGIN - scoreW;
    if (hidden) { doc.draw("No assolit", sx, top + 17, 10, {font: doc.bold, color: "#a12f40", align: "right", width: scoreW}); doc.draw("nota amagada", sx, top + 26, 6.5, {color: "#8995a7", align: "right", width: scoreW}); }
    else { doc.draw(n2(r.adjusted ? r.adjusted.value : r.earned), sx, top + 18, 13, {font: doc.bold, color: r.adjusted ? "#8a5a00" : "#1d2b44", align: "right", width: scoreW}); doc.draw(r.adjusted ? "decidida pel professor" : "nota de la graella", sx, top + 27, 6.5, {color: "#8995a7", align: "right", width: scoreW}); }
    doc.t += rowH;
  }
}

function modulePage(doc: Doc, course: AcademicCourse, group: Group, m: JointModuleResult, student: JointStudent, groupCode: string, now: Date): void {
  const enrollmentId = m.enrollmentId!;
  const s = summarizeStudent(course, group, enrollmentId);
  doc.newPage();
  doc.logoRow();
  doc.heading(course.configuration.moduleName);
  const st = STATUS[s.status];
  // capçalera amb la nota projectada a la dreta
  const headTop = doc.t;
  head(doc, {title: `INFORME CONJUNT D'AVALUACIÓ DE L'ALUMNE · ${course.configuration.abbreviation}`, name: student.name, coverage: s.coverage,
    sub: `${course.configuration.level} · Grup ${groupCode} · ${course.academicYear} · ${course.configuration.moduleName} · Dades a ${today(now)}`});
  const rx = doc.W - MARGIN - 140;
  doc.draw("NOTA PROJECTADA DEL MÒDUL", rx, headTop + 8, 6.5, {color: "#7d899d", align: "right", width: 140});
  doc.draw(n2(s.projected), rx, headTop + 28, 22, {font: doc.bold, color: s.status === "pendent" ? "#6b7a92" : st.fg, align: "right", width: 140});
  doc.draw(`${s.provisional ? "provisional · " : ""}avaluat el ${Math.round(s.coverage)} %`, rx, headTop + 38, 7, {color: "#7d899d", align: "right", width: 140});

  const chipW = doc.chip(st.label, MARGIN, doc.t, st.bg, st.fg, 9);
  if (s.status === "no-superat") doc.chip("Cal recuperar algun RA", MARGIN + chipW + 8, doc.t + 1, "#fff0f1", "#c54c5c", 7.5);
  doc.t += 22;

  if (s.status === "no-superat") {
    const extra = s.requiredFailed.length > 0 ? "Les activitats obligatòries s'han de superar per assolir els RA, independentment de la resta de resultats." : "";
    doc.box({fill: "#fff7e6", stroke: "#efd9a8"}, w => 12 + s.causes.reduce((a, c) => a + doc.paraHeight(`• ${c}`, w, 8, 10.5) + 1, 0) + (extra ? doc.paraHeight(extra, w, 8, 10.5) + 3 : 0), (x, w) => {
      doc.draw("CAUSA", x, doc.t + 7, 7.5, {font: doc.bold, color: "#7d899d"}); doc.t += 12;
      for (const c of s.causes) doc.para(`• ${c}`, {size: 8, x, width: w, lineHeight: 10.5, after: 1});
      if (extra) { doc.t += 2; doc.para(extra, {size: 8, x, width: w, lineHeight: 10.5}); }
    });
  }
  if (s.status === "pendent") doc.para("Encara no hi ha prou activitats avaluades per valorar el mòdul: la nota projectada és provisional.", {size: 8.5, color: "#6b7a92", after: 6});

  // Com va l'avaluació dels RA
  const done = s.ras.filter(r => r.evaluated), early = s.ras.filter(r => !r.evaluated && r.state === "no-assolit"), pending = s.ras.filter(r => !r.evaluated && r.state !== "no-assolit");
  const pendingCodes = pending.map(r => r.code);
  const items: string[] = [
    ...done.map(r => `${r.code}: avaluat completament (${listJoin(r.units)} corregida) · ${r.state === "assolit" ? "assolit" : `no assolit; hi ha mancances: ${r.causes.join("; ") || "la nota no arriba al mínim exigit"}.`}`),
    ...early.map(r => `${r.code}: encara falta corregir activitats (${listJoin(r.units)}), però ja hi ha mancances: ${r.causes.join("; ")}.`),
    ...(pending.length ? [`${listJoin(pendingCodes)}: encara pendents d'avaluar (${listJoin([...new Set(pending.flatMap(r => r.units))])}).`] : []),
    ...(!done.length && !early.length && !pending.length ? ["Encara no hi ha cap RA configurat."] : []),
  ];
  const rule = `El mòdul queda superat si se superen tots i cadascun dels RA que el componen, però fins a final de curs no es pot assegurar${pendingCodes.length ? `: a mesura que s'avaluïn ${listJoin(pendingCodes)} poden aparèixer noves causes, i les actuals poden desaparèixer si es recuperen les mancances` : ": mentre hi hagi mancances, es poden recuperar a la convocatòria extraordinària"}.`;
  doc.box({fill: "#ffffff", stroke: "#dfe5ee"}, w => 12 + items.reduce((a, t) => a + doc.paraHeight(`• ${t}`, w, 8, 10.5) + 1, 0) + doc.paraHeight(rule, w, 8, 10.5) + 3, (x, w) => {
    doc.draw("COM VA L'AVALUACIÓ DELS RA", x, doc.t + 7, 7.5, {font: doc.bold, color: "#7d899d"}); doc.t += 12;
    for (const t of items) doc.para(`• ${t}`, {size: 8, x, width: w, lineHeight: 10.5, after: 1});
    doc.t += 2; doc.para(rule, {size: 8, x, width: w, lineHeight: 10.5});
  });
  doc.para(`Nota projectada. ${PROJECTED_NOTE.replace("La nota projectada és ", "És ")}`, {size: 7.5, color: "#7d899d", after: 8});

  raBars(doc, course, group, enrollmentId, s);

  const text = moduleComment(s);
  doc.t += 4;
  doc.box({fill: "#fbfaf3", stroke: "#e4dcc0"}, w => 12 + doc.paraHeight(text, w, 8.5, 11.5), (x, w) => {
    doc.draw("VALORACIÓ GLOBAL DEL MÒDUL", x, doc.t + 7, 7.5, {font: doc.bold, color: "#7d899d"}); doc.t += 12;
    doc.para(text, {size: 8.5, x, width: w, lineHeight: 11.5});
  });
  if (s.finalAdjustment) doc.para(`Nota final decidida pel professor: ${s.finalAdjustment.value.toFixed(2)} (calculada: ${s.finalAdjustment.calculated.toFixed(2)}). Motiu: ${s.finalAdjustment.reason}`, {size: 8, color: "#52647c", after: 4});
  doc.para(`Un RA queda assolit quan se superen les activitats obligatòries i la nota és igual o superior a ${course.configuration.requiredActivityMinGrade}. Aquest informe no substitueix la resolució final del mòdul. El percentatge al costat del nom és la part del mòdul ja avaluada.`, {size: 7.5, color: "#7d899d"});
}

const MODULE_SCALES = [1, 0.94, 0.88, 0.82, 0.76, 0.7];

export interface StudentPdfResult {bytes: Uint8Array; pages: number; texts: string[]}

/**
 * PDF de l'«Informe conjunt d'avaluació de l'alumne»: una pàgina de resum i una per cada mòdul on és matriculat
 * (més, només si el contingut no hi cap). No porta cap pàgina en blanc.
 */
export async function buildJointStudentPdf(courses: AcademicCourse[], student: JointStudent, course: AcademicCourse, groupCode: string, options: {logo?: Uint8Array | null; now?: Date} = {}): Promise<StudentPdfResult> {
  const now = options.now ?? new Date();
  const doc = await Doc.create(options.logo);
  doc.pdf.setTitle(`Informe conjunt d'avaluació · ${student.name}`);
  doc.pdf.setAuthor("RA · Avaluació");
  doc.pdf.setCreationDate(now);
  summaryPage(doc, courses, student, course, groupCode, now);
  doc.setScale(1);
  student.modules.forEach((m, i) => {
    if (m.state === "absent" || !m.enrollmentId) return;
    const c = courses[i], group = c.groups.find(g => g.enrollments.some(e => e.id === m.enrollmentId));
    if (!group) return;
    // Cada mòdul ha de cabre en una sola pàgina: si desborda, es torna a dibuixar una mica més petit (com el «zoom» de la impressió).
    const start = doc.pdf.getPageCount(), textsLength = doc.texts.length;
    for (const k of MODULE_SCALES) {
      doc.setScale(k);
      modulePage(doc, c, group, m, student, groupCode, now);
      if (doc.pdf.getPageCount() === start + 1 || k === MODULE_SCALES[MODULE_SCALES.length - 1]) break;
      while (doc.pdf.getPageCount() > start) doc.pdf.removePage(start);
      doc.texts.length = textsLength;
    }
    doc.setScale(1);
  });
  doc.finish(`Informe conjunt d'avaluació de l'alumne · ${student.name}`);
  const bytes = await doc.pdf.save();
  return {bytes, pages: doc.pdf.getPageCount(), texts: doc.texts};
}

/** Empaqueta els PDF en un ZIP. */
export async function zipPdfs(files: {name: string; bytes: Uint8Array}[]): Promise<Blob> {
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.bytes);
  return zip.generateAsync({type: "blob", compression: "DEFLATE"});
}

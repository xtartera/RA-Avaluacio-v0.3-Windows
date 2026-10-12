import type {DiagnosticBlock, DiagnosticQuestion} from "../model/domain.ts";

/** Element de text d'una pàgina del PDF (el que retorna pdf.js, simplificat). */
export interface PdfItem {s: string; f: string; x: number; y: number}

export interface ParsedDiagnostic {
  title: string;
  unit: number | null;
  firstName: string;
  lastName: string;
  submittedAt: string | null;
  deliveryNumber: number | null;
  score: number;
  correct: number;
  total: number;
  blocks: DiagnosticBlock[];
  questions: DiagnosticQuestion[];
  activeMinutes: number | null;
  estimatedMinutes: number | null;
  sessions: number | null;
  integrity: string | null;
  fingerprint: string | null;
  warnings: string[];
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const num = (s: string) => Number(s.replace(",", "."));
const SAME_COLUMN = 2;
const WRAP_GAP = 13.8;

/** «0 h 04 min» → 4; «< 1 min» → 0,5. */
export function parseMinutes(text: string | undefined): number | null {
  if (!text) return null;
  if (/<\s*1\s*min/i.test(text)) return 0.5;
  const m = text.match(/(?:(\d+)\s*h)?\s*(\d+)\s*min/i);
  return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) : null;
}

/** El valor que acompanya una etiqueta (l'element següent, si no és una altra etiqueta). */
function valueAfter(items: PdfItem[], label: string, stop: string[] = []): string | undefined {
  const i = items.findIndex(item => clean(item.s) === label);
  if (i < 0) return undefined;
  const next = items[i + 1];
  if (!next) return undefined;
  const text = clean(next.s);
  return stop.includes(text) ? undefined : text;
}

/** Capçalera i peu de pàgina que afegeix el navegador en imprimir (data, títol, adreça, número de pàgina). */
const isPageMargin = (item: PdfItem) => item.y > 805 || item.y < 28;
/** Text d'ajuda d'un camp d'escriptura buit. */
const PLACEHOLDER = "Escriu la resposta";

const isQuestionStart = (items: PdfItem[], i: number) => /^\d+\.\d+$/.test(clean(items[i]?.s ?? "")) && /^Pregunta \d+$/.test(clean(items[i + 1]?.s ?? ""));

function parseQuestionPage(items: PdfItem[], warnings: string[]): DiagnosticQuestion[] {
  const label = items.find(item => /^Pregunta \d+$/.test(clean(item.s)));
  if (!label) return [];
  // Els identificadors de lletra es renumeren a cada pàgina: la negreta és la de l'etiqueta «Pregunta N».
  const bold = label.f;
  const questions: DiagnosticQuestion[] = [];
  let i = 0;
  while (i < items.length) {
    if (!isQuestionStart(items, i)) { i++; continue; }
    const code = clean(items[i].s).match(/^(\d+)\.(\d+)$/)!;
    const tag = clean(items[i + 1].s).match(/^Pregunta (\d+)$/)!;
    let j = i + 2;
    const body: PdfItem[] = [];
    let verdictAt = -1, unknownVerdict = false;
    while (j < items.length) {
      if (isQuestionStart(items, j) || isPageMargin(items[j])) break;
      const text = clean(items[j].s);
      if (/^[✔✖]$/.test(text)) { verdictAt = j; break; }
      // Una pregunta contestada amb «No ho sé» no porta ✔/✖ sinó una línia «— No ho sé».
      if (/^[—–-]\s*No ho sé$/.test(text)) { unknownVerdict = true; j++; break; }
      body.push(items[j]); j++;
    }
    const verdictText = verdictAt >= 0 ? clean(items[verdictAt + 1]?.s ?? "") : "";
    // Línies de l'enunciat: les que comparteixen columna amb la primera.
    const qx = body[0]?.x ?? 0;
    let k = 0;
    const textLines: string[] = [];
    while (k < body.length && Math.abs(body[k].x - qx) <= SAME_COLUMN) { textLines.push(clean(body[k].s)); k++; }
    // Respostes: les línies que continuen la mateixa opció (poc espai vertical) s'ajunten.
    const entries: {text: string; bold: boolean; lastY: number}[] = [];
    for (; k < body.length; k++) {
      const item = body[k], prev = entries[entries.length - 1], text = clean(item.s);
      if (prev && prev.lastY - item.y < WRAP_GAP && text !== "No ho sé") { prev.text += " " + text; prev.lastY = item.y; }
      else entries.push({text, bold: item.f === bold, lastY: item.y});
    }
    const unknownEntry = [...entries].reverse().find(e => e.text === "No ho sé");
    const options = entries.filter(e => e !== unknownEntry);
    const unknown = unknownVerdict || !!unknownEntry?.bold;
    const isText = options.length === 1;
    const typed = isText && options[0].text && options[0].text !== PLACEHOLDER ? [options[0].text] : [];
    const answer = isText ? typed : options.filter(e => e.bold).map(e => e.text);
    let correct = false;
    if (verdictText === "Correcta") correct = true;
    else if (verdictText !== "Incorrecta" && !unknown) warnings.push(`Pregunta ${tag[1]}: no s'ha pogut llegir si és correcta; es compta com a errada.`);
    if (!textLines.length) warnings.push(`Pregunta ${tag[1]}: no s'ha trobat l'enunciat.`);
    questions.push({
      number: Number(tag[1]), block: Number(code[1]), code: `${code[1]}.${code[2]}`, text: textLines.join(" "),
      kind: isText ? "text" : "choice", options: isText ? [] : options.map(e => e.text), answer, unknown, correct,
    });
    i = Math.max(j, i + 2);
  }
  return questions;
}

/** Converteix els elements de text del PDF d'un quadern en el resultat estructurat. */
export function parseDiagnosticPdf(pages: PdfItem[][]): ParsedDiagnostic {
  const warnings: string[] = [];
  const all = pages.flat();

  const prefix = /^Qüestionari de correcció automàtica\s+·\s+/;
  const footer = all.find(item => prefix.test(clean(item.s)));
  if (!footer) throw new Error("Aquest PDF no sembla un qüestionari de correcció automàtica del quadern digital.");
  const title = clean(footer.s).replace(prefix, "");
  const unit = title.match(/\bUT\s*(\d+)/i)?.[1];

  const first = pages[0] ?? [];
  const firstName = valueAfter(first, "Nom", ["Cognoms"]) ?? "";
  const lastName = valueAfter(first, "Cognoms") ?? "";
  if (!firstName && !lastName) warnings.push("No s'ha trobat el nom de l'alumne al PDF.");

  // Resum de resultats.
  const summary = pages.find(page => page.some(item => clean(item.s) === "Resultat del qüestionari")) ?? [];
  const submitted = valueAfter(summary, "Lliurat el");
  const sm = submitted?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
  const submittedAt = sm ? `${sm[3]}-${sm[2].padStart(2, "0")}-${sm[1].padStart(2, "0")}T${sm[4].padStart(2, "0")}:${sm[5]}` : null;
  const deliveryText = valueAfter(summary, "· Lliurament núm.");
  const blocks: DiagnosticBlock[] = [];
  for (let i = 0; i < summary.length; i++) {
    const row = clean(summary[i].s).match(/^Bloc (\d+)\s+[–-]\s+(.+)$/);
    const hits = row && clean(summary[i + 1]?.s ?? "").match(/^(\d+) de (\d+)$/);
    if (!row || !hits) continue;
    const correct = Number(hits[1]), total = Number(hits[2]);
    blocks.push({number: Number(row[1]), title: clean(row[2]), correct, total, wrong: Number(clean(summary[i + 2]?.s)), unknown: Number(clean(summary[i + 3]?.s)), pct: total ? correct / total * 100 : 0, minutes: null});
  }
  const totalRow = summary.findIndex(item => clean(item.s) === "Total");
  const totalHits = totalRow >= 0 ? clean(summary[totalRow + 1]?.s ?? "").match(/^(\d+) de (\d+)$/) : null;
  const scoreMatch = summary.map(item => clean(item.s).match(/^([\d.,]+) sobre 10$/)).find(Boolean);
  if (!blocks.length || !totalHits || !scoreMatch) throw new Error("No s'ha trobat la taula de resultats al PDF: potser no és el dossier complet del qüestionari.");
  const correct = Number(totalHits[1]), total = Number(totalHits[2]);

  const questions = pages.flatMap(page => parseQuestionPage(page, warnings)).sort((a, b) => a.number - b.number);

  // Coherència entre el detall de preguntes i la taula de resum.
  if (questions.length !== total) warnings.push(`El PDF indica ${total} preguntes però se n'han llegit ${questions.length}.`);
  for (const block of blocks) {
    const mine = questions.filter(q => q.block === block.number);
    const ok = mine.filter(q => q.correct).length;
    if (mine.length !== block.total) warnings.push(`Bloc ${block.number}: s'han llegit ${mine.length} de ${block.total} preguntes.`);
    else if (ok !== block.correct) warnings.push(`Bloc ${block.number}: el detall dona ${ok} encerts i el resum ${block.correct}.`);
    else if (mine.filter(q => q.unknown).length !== block.unknown) warnings.push(`Bloc ${block.number}: el detall dona ${mine.filter(q => q.unknown).length} respostes «No ho sé» i el resum ${block.unknown}.`);
  }

  // Integritat i temps.
  const integrityPage = pages.find(page => page.some(item => clean(item.s) === "Control d’integritat del dossier")) ?? [];
  const status = valueAfter(integrityPage, "ESTAT") ?? null;
  const fingerprint = valueAfter(integrityPage, "EMPREMTA") ?? null;
  const current = valueAfter(integrityPage, "ALUMNE ACTUAL"), original = valueAfter(integrityPage, "ALUMNE ORIGINAL");
  if (current && original && current.toLowerCase() !== original.toLowerCase()) warnings.push(`El dossier va ser iniciat per «${original}» i lliurat per «${current}».`);
  if (status && !/verificat/i.test(status)) warnings.push(`Control d'integritat del dossier: «${status}».`);
  const sessionsText = valueAfter(integrityPage, "SESSIONS");

  const timePage = pages.find(page => page.some(item => clean(item.s) === "Registre del temps de treball")) ?? [];
  for (let i = 0; i < timePage.length; i++) {
    const row = clean(timePage[i].s).match(/^(\d+)\.\s+Bloc/);
    const block = row && blocks.find(b => b.number === Number(row[1]));
    if (block) block.minutes = parseMinutes(timePage[i + 1]?.s);
  }

  return {
    title, unit: unit ? Number(unit) : null, firstName, lastName, submittedAt,
    deliveryNumber: deliveryText && /^\d+$/.test(deliveryText) ? Number(deliveryText) : null,
    score: num(scoreMatch[1]), correct, total, blocks, questions,
    activeMinutes: parseMinutes(valueAfter(integrityPage, "ACTIVITAT REGISTRADA AL QUADERN")),
    estimatedMinutes: parseMinutes(valueAfter(integrityPage, "Temps total estimat:")),
    sessions: sessionsText && /^\d+$/.test(sessionsText) ? Number(sessionsText) : null,
    integrity: status, fingerprint, warnings,
  };
}

const tokens = (name: string) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("ca").split(/[^a-z0-9ñç·]+/).filter(Boolean);

/** Proposa la matrícula que correspon al nom del PDF (nom + cognoms) entre els alumnes del grup. */
export function matchStudent(people: {enrollmentId: string; name: string}[], firstName: string, lastName: string): {enrollmentId: string; exact: boolean} | null {
  const wanted = new Set(tokens(`${firstName} ${lastName}`));
  if (!wanted.size) return null;
  const scored = people.map(p => {
    const have = new Set(tokens(p.name));
    const shared = [...wanted].filter(t => have.has(t)).length;
    return {enrollmentId: p.enrollmentId, shared, exact: shared === wanted.size && shared === have.size, contained: shared === wanted.size || shared === have.size, score: shared / new Set([...wanted, ...have]).size};
  }).filter(c => c.contained && c.shared > 0).sort((a, b) => b.score - a.score);
  if (!scored.length || (scored.length > 1 && scored[0].score === scored[1].score)) return null;
  return {enrollmentId: scored[0].enrollmentId, exact: scored[0].exact};
}

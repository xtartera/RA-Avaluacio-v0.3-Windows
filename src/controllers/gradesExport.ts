import * as XLSX from "xlsx";
import {activityWeights, calculateStudent, totalGrade} from "../model/calculation.ts";
import type {AcademicCourse, Activity, Group} from "../model/domain.ts";
import {summarizeStudent} from "../model/studentSummary.ts";

export type Cell = string | number | null;
export interface SheetData {name: string; rows: Cell[][]; widths?: number[]}

const STATUS_TEXT = {pending: "Pendent", graded: "Avaluada", not_presented: "No presentat"} as const;
const STATE_TEXT = {superat: "Superat de moment", "no-superat": "No superat de moment", pendent: "Pendent d'avaluar"} as const;
const RA_STATE_TEXT = {assolit: "Assolit", "no-assolit": "No assolit", "en-curs": "En curs"} as const;

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;
const compareNames = (a: string, b: string) => a.localeCompare(b, "ca");

/** Nom de full vàlid per a Excel: màxim 31 caràcters, sense []:*?/\ i únic dins del llibre. */
export function sheetName(raw: string, used: Set<string>): string {
  const base = raw.replace(/[[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31).replace(/[\s(·,;:-]+$/, "") || "Full";
  let name = base;
  for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base.slice(0, 31 - String(n).length - 1)} ${n}`;
  used.add(name.toLowerCase());
  return name;
}

const roster = (group: Group) => group.enrollments.filter(e => e.status === "active")
  .map(enrollment => ({enrollment, name: group.students.find(s => s.id === enrollment.studentId)?.name ?? ""}))
  .filter(x => x.name).sort((a, b) => compareNames(a.name, b.name));

const stamp = (date: Date) => date.toLocaleString("ca", {day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"});

/** Activitats actives del mòdul agrupades per UT (en l'ordre de les UT); les que no són a cap UT van a «Altres activitats». */
export function courseSections(course: AcademicCourse): {sections: {name: string; activities: Activity[]}[]; ordinary: Activity[]; extraordinary: Activity[]} {
  const cfg = course.configuration;
  const ordinary = cfg.activities.filter(a => a.status === "active" && a.session === "ordinaria").sort((x, y) => x.order - y.order);
  const extraordinary = cfg.activities.filter(a => a.status === "active" && a.session === "extraordinaria").sort((x, y) => x.order - y.order);

  const units = cfg.workUnits.filter(u => u.status === "active").sort((x, y) => x.order - y.order);
  const placed = new Set<string>();
  const sections: {name: string; activities: Activity[]}[] = units.map(u => {
    const list = ordinary.filter(a => u.activityIds.includes(a.id));
    list.forEach(a => placed.add(a.id));
    return {name: u.name, activities: list};
  }).filter(s => s.activities.length > 0);
  const rest = ordinary.filter(a => !placed.has(a.id));
  if (rest.length) sections.push({name: sections.length ? "Altres activitats" : "Notes", activities: rest});
  if (extraordinary.length) sections.push({name: "Extraordinària", activities: extraordinary});
  return {sections, ordinary, extraordinary};
}

/**
 * Llibre de càlcul amb les notes introduïdes: un full de resum, un full per UT (alumnes × activitats), un full amb
 * les bonificacions i un full llarg «Totes les notes» pensat per a taules dinàmiques i filtres.
 */
export function buildGradesWorkbook(course: AcademicCourse, groups: Group[], now = new Date()): SheetData[] {
  const cfg = course.configuration;
  const typeName = (a: Activity) => cfg.activityTypes.find(t => t.id === a.activityTypeId)?.name ?? "";
  const weights = activityWeights(course);
  const multiGroup = groups.length > 1;
  const used = new Set<string>();
  const title = `${cfg.moduleName} (${cfg.abbreviation}) · ${course.academicYear}`;
  const generated = `Generat el ${stamp(now)} · Dades de l'app RA · Avaluació`;
  const {sections, ordinary, extraordinary} = courseSections(course);

  const sheets: SheetData[] = [];

  // --- Resum
  const summary: Cell[][] = [[title], [generated], []];
  for (const group of groups) {
    summary.push([`Grup ${group.code}`]);
    summary.push(["Alumne", "Nota projectada", "Nota acumulada", "Cobertura (%)", "Estat", "RA assolits", "RA no assolits", "RA en curs"]);
    for (const {enrollment, name} of roster(group)) {
      const calc = calculateStudent(course, group, enrollment.id), s = summarizeStudent(course, group, enrollment.id);
      const codes = (state: keyof typeof RA_STATE_TEXT) => s.ras.filter(r => r.state === state).map(r => r.code).join(", ");
      summary.push([name, round(s.projected), round(calc.globalAccumulated), round(s.coverage, 0), STATE_TEXT[s.status], codes("assolit"), codes("no-assolit"), codes("en-curs")]);
    }
    summary.push([]);
  }
  sheets.push({name: sheetName("Resum", used), rows: summary, widths: [34, 15, 15, 13, 22, 20, 20, 20]});

  // --- Un full per UT (i grup)
  for (const group of groups) {
    for (const section of sections) {
      const label = multiGroup ? `${group.code} · ${section.name}` : section.name;
      const grades = new Map(group.grades.map(g => [`${g.enrollmentId}|${g.activityId}`, g] as const));
      const rows: Cell[][] = [
        [`${title} · Grup ${group.code} · ${section.name}`],
        [generated],
        [],
        ["Activitat", ...section.activities.map(a => a.name)],
        ["Tipus", ...section.activities.map(typeName)],
        ["Pes sobre el mòdul (%)", ...section.activities.map(a => weights.has(a.id) ? round((weights.get(a.id) ?? 0) * 100, 1) : null)],
        ["Data", ...section.activities.map(a => a.date ?? "")],
        ["Alumne", ...section.activities.map(() => "Nota")]
      ];
      for (const {enrollment, name} of roster(group)) {
        rows.push([name, ...section.activities.map(a => {
          const grade = grades.get(`${enrollment.id}|${a.id}`);
          if (grade?.status === "not_presented") return "NP";
          const total = totalGrade(grade);
          return total === null ? "" : round(total);
        })]);
      }
      rows.push([], ["NP = no presentat · cel·la buida = pendent d'avaluar · la nota inclou les bonificacions"]);
      sheets.push({name: sheetName(label, used), rows, widths: [34, ...section.activities.map(() => 16)]});
    }
  }

  // --- Bonificacions i notes de professor
  const bonus: Cell[][] = [[title], [generated], [], ["Grup", "Alumne", "Activitat", "Bonificació", "Motiu"]];
  const adjustments: Cell[][] = [["Grup", "Alumne", "Tipus", "Referència", "Nota calculada", "Nota decidida", "Motiu"]];
  for (const group of groups) {
    const activityName = new Map(cfg.activities.map(a => [a.id, a.name]));
    for (const {enrollment, name} of roster(group)) {
      for (const grade of group.grades.filter(g => g.enrollmentId === enrollment.id))
        for (const b of grade.bonuses) bonus.push([group.code, name, activityName.get(grade.activityId) ?? "", b.value, b.reason]);
      const calc = calculateStudent(course, group, enrollment.id);
      for (const ra of cfg.learningResults) {
        const result = calc.learningResults.get(ra.id);
        if (result?.adjusted) adjustments.push([group.code, name, "RA", ra.code, round(result.adjusted.calculated), round(result.score), result.adjusted.reason]);
      }
      if (calc.finalAdjustment) adjustments.push([group.code, name, "Nota final", "", round(calc.finalAdjustment.calculated), round(calc.finalAdjustment.value), calc.finalAdjustment.reason]);
    }
  }
  if (bonus.length > 4) sheets.push({name: sheetName("Bonificacions", used), rows: bonus, widths: [8, 34, 32, 12, 50]});
  if (adjustments.length > 1) sheets.push({name: sheetName("Notes del professor", used), rows: adjustments, widths: [8, 34, 12, 12, 14, 14, 50]});

  // --- Totes les notes (format llarg)
  const long: Cell[][] = [["Grup", "Alumne", "UT", "Activitat", "Tipus", "Sessió", "Data", "Estat", "Nota base", "Bonificació", "Nota total", "Pes sobre el mòdul (%)", "Última modificació"]];
  const unitOf = new Map<string, string>();
  for (const s of sections) for (const a of s.activities) unitOf.set(a.id, s.name);
  for (const group of groups) {
    const grades = new Map(group.grades.map(g => [`${g.enrollmentId}|${g.activityId}`, g] as const));
    for (const {enrollment, name} of roster(group)) {
      for (const a of [...ordinary, ...extraordinary]) {
        const g = grades.get(`${enrollment.id}|${a.id}`);
        const total = totalGrade(g);
        long.push([group.code, name, unitOf.get(a.id) ?? "", a.name, typeName(a), a.session === "extraordinaria" ? "Extraordinària" : "Ordinària", a.date ?? "",
          g ? STATUS_TEXT[g.status] : STATUS_TEXT.pending, g && g.baseValue !== null ? round(g.baseValue) : null,
          g ? round(g.bonuses.reduce((sum, b) => sum + b.value, 0)) : null, total === null ? null : round(total),
          weights.has(a.id) ? round((weights.get(a.id) ?? 0) * 100, 1) : null, g?.updatedAt ?? ""]);
      }
    }
  }
  sheets.push({name: sheetName("Totes les notes", used), rows: long, widths: [8, 34, 24, 32, 16, 14, 12, 14, 11, 12, 11, 18, 24]});
  return sheets;
}

export function workbookFileName(course: AcademicCourse, groups: Group[], now = new Date()): string {
  const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const p = (n: number) => String(n).padStart(2, "0");
  const scope = groups.length === 1 ? `-grup-${groups[0].code}` : "";
  return `notes-${slug(course.configuration.abbreviation)}-${slug(course.academicYear)}${scope}-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.xlsx`;
}

export function downloadGradesWorkbook(course: AcademicCourse, groups: Group[]): string {
  const now = new Date();
  const book = XLSX.utils.book_new();
  for (const sheet of buildGradesWorkbook(course, groups, now)) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
    if (sheet.widths) ws["!cols"] = sheet.widths.map(wch => ({wch}));
    XLSX.utils.book_append_sheet(book, ws, sheet.name);
  }
  const fileName = workbookFileName(course, groups, now);
  XLSX.writeFile(book, fileName);
  return fileName;
}

// ---------------------------------------------------------------------------------------------
// Registre en paper: una taula per grup amb totes les activitats agrupades per UT, repartida en pàgines
// horitzontals de com a màxim `maxColumns` activitats (una UT només es parteix si no hi cap sola).
// ---------------------------------------------------------------------------------------------

export interface RegisterColumn {name: string; type: string; weight: string; date: string}
export interface RegisterUnit {name: string; span: number}
export interface RegisterRow {name: string; cells: string[]}
export interface RegisterPage {groupCode: string; groupName: string; units: RegisterUnit[]; columns: RegisterColumn[]; rows: RegisterRow[]; part: number; parts: number}
export interface Register {title: string; generated: string; pages: RegisterPage[]}

const comma = (value: number) => String(round(value)).replace(".", ",");

export function buildRegister(course: AcademicCourse, groups: Group[], now = new Date(), maxColumns = 14): Register {
  const cfg = course.configuration;
  const weights = activityWeights(course);
  const typeName = (a: Activity) => cfg.activityTypes.find(t => t.id === a.activityTypeId)?.name ?? "";
  const {sections} = courseSections(course);

  // Reparteix les seccions en blocs de com a màxim `maxColumns` columnes.
  type Piece = {unit: string; activities: Activity[]};
  const pieces: Piece[] = [];
  for (const section of sections) {
    for (let i = 0; i < section.activities.length; i += maxColumns)
      pieces.push({unit: i === 0 ? section.name : `${section.name} (cont.)`, activities: section.activities.slice(i, i + maxColumns)});
  }
  const blocks: Piece[][] = [];
  for (const piece of pieces) {
    const last = blocks.at(-1);
    if (last && last.reduce((n, p) => n + p.activities.length, 0) + piece.activities.length <= maxColumns) last.push(piece); else blocks.push([piece]);
  }

  const pages: RegisterPage[] = [];
  for (const group of groups) {
    const people = roster(group);
    const grades = new Map(group.grades.map(g => [`${g.enrollmentId}|${g.activityId}`, g] as const));
    blocks.forEach((block, index) => {
      const activities = block.flatMap(p => p.activities);
      pages.push({
        groupCode: group.code, groupName: group.name, part: index + 1, parts: blocks.length,
        units: block.map(p => ({name: p.unit, span: p.activities.length})),
        columns: activities.map(a => ({name: a.name, type: typeName(a), weight: weights.has(a.id) ? `${comma((weights.get(a.id) ?? 0) * 100)} %` : "", date: a.date ?? ""})),
        rows: people.map(({enrollment, name}) => ({name, cells: activities.map(a => {
          const grade = grades.get(`${enrollment.id}|${a.id}`);
          if (grade?.status === "not_presented") return "NP";
          const total = totalGrade(grade);
          return total === null ? "" : comma(total);
        })}))
      });
    });
  }
  return {title: `${cfg.moduleName} (${cfg.abbreviation}) · ${course.academicYear}`, generated: `Generat el ${stamp(now)}`, pages};
}

import * as XLSX from "xlsx";
import {
  createCourse, newId, nowIso,
  type AcademicCourse, type Activity, type ActivityCriterionLink, type ActivityType,
  type AssessmentCriterion, type Grade, type GradeBonus, type LearningResult,
} from "../model/domain";

export interface ImportPreview {
  course: AcademicCourse;
  summary: {learningResults: number; criteria: number; activities: number; students: number; grades: number};
  warnings: string[];
}

const text = (sheet: XLSX.WorkSheet, address: string) => {
  const value = sheet[address]?.v;
  return value === undefined || value === null ? "" : String(value).trim();
};
const number = (sheet: XLSX.WorkSheet, address: string) => {
  const value = sheet[address]?.v;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};
const normalizeActivityName = (value: string) => value
  .replace(/^ExTeoric\s*40$/i, "ExTeòric 40")
  .replace(/^ExPractic\s*40$/i, "ExPràctic 40");
const genericStudent = (name: string) => /^(alumno|alumne)\s+\d+$/i.test(name.trim());

function requiredSheet(workbook: XLSX.WorkBook, plainName: string): XLSX.WorkSheet {
  const name = workbook.SheetNames.find(item => item.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() === plainName);
  if (!name) throw new Error(`Falta el full obligatori ${plainName}.`);
  return workbook.Sheets[name];
}

function importedBonuses(formula: string | undefined): {base: number; bonuses: GradeBonus[]} | null {
  if (!formula) return null;
  const values = formula.replace(/^=/, "").match(/\d+(?:[.,]\d+)?/g)?.map(v => Number(v.replace(",", "."))) ?? [];
  if (values.length < 2 || values.some(v => !Number.isFinite(v))) return null;
  const base = Math.max(...values.filter(v => v <= 10));
  let extra = values.reduce((sum, value) => sum + value, 0) - base;
  const bonuses: GradeBonus[] = [];
  while (extra >= .49) {
    const value: 0.5 | 1 = extra >= .99 ? 1 : .5;
    bonuses.push({id: newId("bonus"), value, reason: "Importat de l’Excel", source: "excel", historicalException: true, createdAt: nowIso()});
    extra = Math.round((extra - value) * 100) / 100;
  }
  return {base: Math.min(10, base), bonuses};
}

export async function importEvaluationWorkbook(file: File, academicYear = "2026–2027"): Promise<ImportPreview> {
  if (!/\.(xlsx|xls|xlsm)$/i.test(file.name)) throw new Error("El fitxer ha de ser .xlsx, .xls o .xlsm.");
  const workbook = XLSX.read(await file.arrayBuffer(), {type: "array", cellFormula: true, cellNF: true, cellDates: true});
  const trace = requiredSheet(workbook, "TRAZABILIDAD");
  const weighting = requiredSheet(workbook, "PONDERACION");
  const instruments = requiredSheet(workbook, "INSTRUMENTOS");
  requiredSheet(workbook, "CRITERIOS"); requiredSheet(workbook, "APRENDIZAJE");
  const warnings: string[] = [];
  const course = createCourse(academicYear);
  const config = course.configuration;

  const learningResults: LearningResult[] = [];
  const criteria: AssessmentCriterion[] = [];
  for (let raNumber = 1; raNumber <= 10; raNumber++) {
    const start = 3 + (raNumber - 1) * 20;
    const description = text(trace, `B${start}`);
    const realCriteria = Array.from({length: 20}, (_, offset) => start + offset)
      .filter(row => { const value = text(trace, `C${row}`); return value && !/^Copia aquí/i.test(value); });
    if (!description || /^R\.A\.\d+$/i.test(description) || !realCriteria.length) continue;
    const ra: LearningResult = {id: newId("ra"), code: `RA${raNumber}`, description, order: learningResults.length + 1, status: "active"};
    learningResults.push(ra);
    for (const row of realCriteria) criteria.push({
      id: newId("ca"), learningResultId: ra.id, code: text(trace, `D${row}`),
      description: text(trace, `C${row}`), order: criteria.filter(c => c.learningResultId === ra.id).length + 1, status: "active",
    });
  }
  if (learningResults.length !== 6 || criteria.length !== 48) warnings.push(`S’han detectat ${learningResults.length} RA i ${criteria.length} CA; la plantilla de referència en conté 6 i 48.`);

  const activityTypeByName = new Map<string, ActivityType>();
  for (let row = 3; row <= 42; row++) {
    const name = text(trace, `U${row}`); if (!name) continue;
    const normalized = name.replace("ExPràctic", "ExPràctic").replace("ExTeòric", "ExTeòric");
    const type: ActivityType = {id: newId("type"), name: normalized, weight: number(trace, `V${row}`), status: "active"};
    activityTypeByName.set(name, type); config.activityTypes.push(type);
  }

  const activityByColumn = new Map<number, Activity>();
  for (let column = 5; column < 65; column++) {
    const address = XLSX.utils.encode_cell({r: 1, c: column});
    const rawName = text(weighting, address);
    if (!rawName || rawName === "0") continue;
    const typeName = text(weighting, XLSX.utils.encode_cell({r: 2, c: column}));
    let type = activityTypeByName.get(typeName);
    if (!type) {
      type = {id: newId("type"), name: typeName || "Sense tipus", weight: 0, status: "active"};
      activityTypeByName.set(typeName, type); config.activityTypes.push(type);
      warnings.push(`S’ha creat el tipus desconegut “${type.name}”.`);
    }
    const activity: Activity = {
      id: newId("activity"), name: normalizeActivityName(rawName), activityTypeId: type.id,
      term: column < 25 ? 1 : 2, date: null, order: activityByColumn.size + 1, status: "active",
    };
    activityByColumn.set(column, activity); config.activities.push(activity);
  }

  const caByCode = new Map(criteria.map(c => [c.code, c]));
  const links: ActivityCriterionLink[] = [];
  for (let row = 7; row <= 206; row++) {
    const criterion = caByCode.get(text(weighting, `D${row}`)); if (!criterion) continue;
    for (const [column, activity] of activityByColumn) {
      const allocation = number(weighting, XLSX.utils.encode_cell({r: row - 1, c: column}));
      if (allocation > 0) links.push({id: newId("link"), activityId: activity.id, criterionId: criterion.id, allocation});
    }
  }
  config.learningResults = learningResults; config.criteria = criteria; config.links = links;

  const group = course.groups.find(g => g.code === "A")!;
  for (let row = 7; row <= 31; row++) {
    const name = text(instruments, `B${row}`);
    if (!name || genericStudent(name)) continue;
    const student = {id: newId("student"), name};
    const enrollment = {id: newId("enrollment"), studentId: student.id, groupId: group.id, status: "active" as const, createdAt: nowIso()};
    group.students.push(student); group.enrollments.push(enrollment);
    for (const [column, activity] of activityByColumn) {
      const cell = instruments[XLSX.utils.encode_cell({r: row - 1, c: column})];
      if (!cell || cell.v === undefined || cell.v === null || cell.v === "") continue;
      const formulaParts = importedBonuses(cell.f);
      const raw = typeof cell.v === "number" ? cell.v : Number(cell.v);
      if (!Number.isFinite(raw)) { warnings.push(`Nota no numèrica ignorada a ${cell.f ?? cell.v}.`); continue; }
      const grade: Grade = {
        id: newId("grade"), enrollmentId: enrollment.id, activityId: activity.id, status: "graded",
        baseValue: formulaParts?.base ?? Math.min(10, Math.max(0, raw)), bonuses: formulaParts?.bonuses ?? [], updatedAt: nowIso(),
      };
      group.grades.push(grade);
    }
  }
  for (const activity of config.activities) {
    const count = group.grades.filter(g => g.activityId === activity.id && g.status !== "pending").length;
    group.activityStates.push({activityId: activity.id, automaticEvaluatedAt: count >= 5 ? nowIso() : null, manualOverride: null});
  }
  course.imports.push({id: newId("import"), fileName: file.name, importedAt: nowIso(), warnings});
  return {course, warnings, summary:{learningResults:learningResults.length, criteria:criteria.length, activities:config.activities.length, students:group.students.length, grades:group.grades.length}};
}

export function parseStudentCsv(content: string): {names: string[]; warnings: string[]} {
  const rows = content.replace(/^\uFEFF/, "").split(/\r?\n/).map(row => {
    const value = row.trim();
    if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1).replace(/""/g, '"').trim();
    return value.split(/[;,]/)[0].trim();
  }).filter(Boolean);
  if (rows[0]?.toLocaleLowerCase("ca") === "nom") rows.shift();
  if (rows.length > 25) throw new Error("El CSV conté més de 25 alumnes.");
  const normalized = rows.map(name => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("ca").replace(/\s+/g, " "));
  const duplicates = rows.filter((_, i) => normalized.indexOf(normalized[i]) !== i);
  if (duplicates.length) throw new Error(`Hi ha noms duplicats: ${[...new Set(duplicates)].join(", ")}.`);
  return {names: rows.sort((a,b) => a.localeCompare(b,"ca")), warnings: []};
}

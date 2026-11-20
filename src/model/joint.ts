import {jointTrendSentence, type StudentTrend} from "./trend.ts";
import {calculateStudent} from "./calculation.ts";
import {countsForGrade, type AcademicCourse, type AppDatabase, type Group} from "./domain.ts";
import {summarizeStudent, type SummaryStatus} from "./studentSummary.ts";

/** Estat d'un alumne en un mòdul de la vista conjunta; «absent» = no hi està matriculat. */
export type JointState = SummaryStatus | "absent";

export interface JointAdjustment {code: string; value: number; calculated: number; reason: string}

export interface JointModuleResult {
  courseId: string;
  moduleName: string;
  abbreviation: string;
  state: JointState;
  enrollmentId?: string;
  /** Nota projectada del mòdul (o la decidida pel professor); null si encara no hi ha cap evidència. */
  projected: number | null;
  coverage: number;
  /** RA assolits / no assolits / en curs, tal com els decideix cada mòdul. */
  achieved: string[];
  failed: string[];
  inProgress: string[];
  causes: string[];
  /** Nota final del mòdul decidida pel professor, si n'hi ha. */
  finalAdjustment?: {value: number; calculated: number; reason: string};
  /** Notes d'RA decidides pel professor. */
  raAdjustments: JointAdjustment[];
  /** Evolució dels últims resultats en aquest mòdul (null si encara hi ha poques activitats avaluades). */
  trend?: StudentTrend | null;
}

export interface JointStudent {
  key: string;
  name: string;
  modules: JointModuleResult[];
  /** Mòduls on l'alumne és present. */
  present: number;
  passed: number;
  failed: number;
  pending: number;
}

/** Mòduls de la vista conjunta: els cursos no arxivats del mateix curs acadèmic que l'actiu (i de la mateixa classe: reals amb reals, de prova amb de prova). */
export function jointCourses(db: AppDatabase, active: AcademicCourse): AcademicCourse[] {
  return db.courses.filter(c => !c.archived && c.academicYear === active.academicYear && c.isTest === active.isTest)
    .sort((a, b) => a.configuration.moduleName.localeCompare(b.configuration.moduleName, "ca"));
}

/** Clau per reconèixer el mateix alumne a dos mòduls: sense accents ni majúscules i amb els mots ordenats («Cognom, Nom» = «Nom Cognom»). */
export function studentKey(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("ca").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean).sort().join(" ");
}

function moduleResult(course: AcademicCourse, group: Group | undefined, key: string): JointModuleResult {
  const base = {courseId: course.id, moduleName: course.configuration.moduleName, abbreviation: course.configuration.abbreviation};
  const empty = {...base, state: "absent" as const, projected: null, coverage: 0, achieved: [], failed: [], inProgress: [], causes: [], raAdjustments: []};
  if (!group) return empty;
  const enrollment = group.enrollments.find(e => e.status === "active" && studentKey(group.students.find(s => s.id === e.studentId)?.name ?? "") === key);
  if (!enrollment) return empty;
  const summary = summarizeStudent(course, group, enrollment.id), calc = calculateStudent(course, group, enrollment.id);
  const scored = new Set(course.configuration.activities.filter(countsForGrade).map(a => a.id));
  const hasEvidence = group.grades.some(g => g.enrollmentId === enrollment.id && g.status !== "pending" && scored.has(g.activityId)) || !!summary.finalAdjustment;
  const ras = course.configuration.learningResults.filter(r => r.status === "active").sort((a, b) => a.order - b.order);
  const raAdjustments: JointAdjustment[] = ras.flatMap(r => { const x = calc.learningResults.get(r.id); return x?.adjusted ? [{code: r.code, value: x.score, calculated: x.adjusted.calculated, reason: x.adjusted.reason}] : []; });
  return {
    ...base, state: hasEvidence ? summary.status : "pendent", enrollmentId: enrollment.id,
    projected: hasEvidence ? summary.projected : null, coverage: summary.coverage,
    achieved: summary.ras.filter(r => r.state === "assolit").map(r => r.code), failed: summary.ras.filter(r => r.state === "no-assolit").map(r => r.code), inProgress: summary.ras.filter(r => r.state === "en-curs").map(r => r.code),
    trend: hasEvidence ? summary.trend : null, causes: summary.causes, finalAdjustment: summary.finalAdjustment ? {value: summary.finalAdjustment.value, calculated: summary.finalAdjustment.calculated, reason: summary.finalAdjustment.reason} : undefined, raAdjustments,
  };
}

/** Alumnes actius del grup `groupCode` de tots els mòduls, units pel nom, amb el resultat de cada mòdul. L'ordre és alfabètic. */
export function buildJointStudents(courses: AcademicCourse[], groupCode: string): JointStudent[] {
  const groups = courses.map(c => c.groups.find(g => g.code === groupCode));
  const names = new Map<string, string>();
  groups.forEach(g => g?.enrollments.filter(e => e.status === "active").forEach(e => {
    const name = g.students.find(s => s.id === e.studentId)?.name;
    if (name && !names.has(studentKey(name))) names.set(studentKey(name), name);
  }));
  return [...names].map(([key, name]) => {
    const modules = courses.map((c, i) => moduleResult(c, groups[i], key)), present = modules.filter(m => m.state !== "absent");
    return {key, name, modules, present: present.length, passed: present.filter(m => m.state === "superat").length, failed: present.filter(m => m.state === "no-superat").length, pending: present.filter(m => m.state === "pendent").length};
  }).sort((a, b) => a.name.localeCompare(b.name, "ca"));
}

export interface JointModuleStats {courseId: string; moduleName: string; abbreviation: string; students: number; evaluated: number; average: number | null; passed: number; failed: number; pending: number; coverage: number; adjusted: number}

export interface JointAnalysis {
  modules: JointModuleStats[];
  /** Alumnes amb algun mòdul no superat: dos o més mòduls / només un. */
  riskInSeveral: JointStudent[];
  riskInOne: JointStudent[];
  /** Alumnes que només consten a un dels mòduls (cal revisar-los: poden ser casos legítims o un nom escrit diferent). */
  partial: JointStudent[];
  /** Alumnes amb una diferència de nota de 2 punts o més entre dos mòduls amb nota. */
  gaps: {student: JointStudent; high: JointModuleResult; low: JointModuleResult}[];
  allPassed: JointStudent[];
}

export function analyzeJoint(courses: AcademicCourse[], students: JointStudent[]): JointAnalysis {
  const modules: JointModuleStats[] = courses.map((c, i) => {
    const rs = students.map(s => s.modules[i]).filter(m => m.state !== "absent"), graded = rs.filter(m => m.projected !== null);
    return {
      courseId: c.id, moduleName: c.configuration.moduleName, abbreviation: c.configuration.abbreviation, students: rs.length, evaluated: graded.length,
      average: graded.length ? graded.reduce((s, m) => s + m.projected!, 0) / graded.length : null,
      passed: rs.filter(m => m.state === "superat").length, failed: rs.filter(m => m.state === "no-superat").length, pending: rs.filter(m => m.state === "pendent").length,
      coverage: rs.length ? rs.reduce((s, m) => s + m.coverage, 0) / rs.length : 0,
      adjusted: rs.filter(m => m.finalAdjustment || m.raAdjustments.length).length,
    };
  });
  const gaps = students.flatMap(student => {
    const graded = student.modules.filter(m => m.projected !== null).sort((a, b) => b.projected! - a.projected!);
    return graded.length >= 2 && graded[0].projected! - graded[graded.length - 1].projected! >= 2 ? [{student, high: graded[0], low: graded[graded.length - 1]}] : [];
  });
  return {
    modules,
    riskInSeveral: students.filter(s => s.failed >= 2), riskInOne: students.filter(s => s.failed === 1),
    partial: courses.length > 1 ? students.filter(s => s.present < courses.length) : [], gaps,
    allPassed: students.filter(s => s.present === courses.length && s.passed === s.present && s.present > 0),
  };
}

/** Text de les notes decidides pel professor d'un mòdul (RA i nota final). */
const fmt2 = (v: number) => v.toLocaleString("ca", {minimumFractionDigits: 2, maximumFractionDigits: 2});
export const adjustmentTexts = (m: JointModuleResult) => [
  ...m.raAdjustments.map(a => `${a.code}: ${fmt2(a.value)} decidida pel professor (calculada ${fmt2(a.calculated)}). Motiu: ${a.reason}`),
  ...(m.finalAdjustment ? [`Nota final: ${fmt2(m.finalAdjustment.value)} decidida pel professor (calculada ${fmt2(m.finalAdjustment.calculated)}). Motiu: ${m.finalAdjustment.reason}`] : []),
];

/** Valoració global conjunta d'un alumne: l'estat de cada mòdul i l'evolució dels últims resultats. */
export function jointComment(student: JointStudent): string {
  const present = student.modules.filter(m => m.state !== "absent");
  if (!present.length) return "";
  const list = (state: JointModuleResult["state"]) => present.filter(m => m.state === state).map(m => m.moduleName);
  const join = (xs: string[]) => xs.length > 1 ? `${xs.slice(0, -1).join(", ")} i ${xs[xs.length - 1]}` : xs[0];
  const parts: string[] = [];
  if (list("superat").length) parts.push(`De moment supera ${list("superat").length === present.length ? "tots els mòduls cursats" : join(list("superat"))}`);
  if (list("no-superat").length) parts.push(`De moment no supera ${join(list("no-superat"))}${present.filter(m => m.state === "no-superat").flatMap(m => m.failed).length ? `, amb RA pendents de recuperar (${present.filter(m => m.state === "no-superat").map(m => `${m.abbreviation}: ${m.failed.join(", ") || "nota global"}`).join("; ")})` : ""}`);
  if (list("pendent").length) parts.push(`${join(list("pendent"))} ${list("pendent").length > 1 ? "són encara provisionals" : "és encara provisional"}, per falta d'evidències corregides`);
  const trend = jointTrendSentence(present.map(m => ({abbreviation: m.abbreviation, trend: m.trend})));
  return `${parts.join(". ")}.${trend ? ` ${trend}` : ""}`;
}

/** Nota a peu de l'informe conjunt de l'alumne. */
export function jointFootnote(courses: {configuration: {abbreviation: string; minRaCoverage?: number}}[], withModulePages: boolean): string {
  return `«De moment» vol dir que l'estat es basa només en el que ja està corregit; «Pendent d'avaluar» vol dir que encara no s'ha arribat al percentatge mínim d'avaluació del mòdul (${courses.map(c => `${c.configuration.abbreviation} ${c.configuration.minRaCoverage ?? 25}%`).join(", ")}), i llavors la nota és només provisional. Cada mòdul s'avalua amb els seus propis criteris; no hi ha una nota global dels mòduls.${withModulePages ? " Les pàgines següents detallen cada mòdul." : ""} Aquest informe no substitueix la resolució final.`;
}

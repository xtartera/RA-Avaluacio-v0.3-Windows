import {calculateStudent} from "./calculation.ts";
import type {TrafficColor} from "./currentEvidence.ts";
import type {AcademicCourse, Group} from "./domain.ts";
import type {PreevaluationRow} from "./preevaluation.ts";
import {summarizeStudent, type RaState, type SummaryStatus} from "./studentSummary.ts";

/** Situació d'un RA en el moment de l'avaluació. */
export interface RaProgress {
  code: string;
  state: RaState;
  /** Nota actual de l'RA, sobre el que ja està avaluat (null si encara no n'hi ha). */
  score: number | null;
  /** Percentatge de l'RA que ja està avaluat (0-100). */
  coverage: number;
  /** Mitjana aproximada que caldria en la part que falta per arribar al mínim: ≤ 0 = ja assegurat; > 10 = no s'hi arriba amb el que queda. Només per als RA en curs ja començats. */
  needed: number | null;
  /** L'RA no s'assoleix per una activitat obligatòria pendent de superar. */
  requiredFailed: boolean;
  /** La nota actual (sobre el que ja està avaluat) és per sota del mínim per aprovar: encara cal millorar-la. */
  belowMin?: boolean;
}

export interface FirstEvaluationInput {
  /** Percentatge del mòdul ja avaluat. */
  coverage: number;
  provisional: boolean;
  status: SummaryStatus;
  projected: number;
  minGrade: number;
  ras: RaProgress[];
}

/** Missatge de tancament segons el semàfor (es posa un sol cop per alumne a l'acta de tots els mòduls). */
export const firstEvaluationClosing = (color: TrafficColor): string => TEXT_CLOSING[color];
const n1 = (v: number) => v.toFixed(1).replace(".", ",");
const pct = (v: number) => `${Math.round(v)} %`;
const list = (items: string[]) => items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} i ${items[items.length - 1]}`;

type Class = "no-comencat" | "assegurat" | "bon-ritme" | "esforc" | "exigent" | "impossible";
/** Classifica un RA en curs segons la mitjana que caldria en la part que falta. */
export function classifyRaInProgress(ra: RaProgress): Class {
  const needed = ra.needed;
  if (ra.coverage <= 0) return "no-comencat";
  if (needed === null) return "bon-ritme";
  if (needed <= 0) return "assegurat";
  if (needed <= 6) return ra.belowMin ? "esforc" : "bon-ritme";
  if (needed <= 9) return "esforc";
  if (needed <= 10) return "exigent";
  return "impossible";
}

/** Semàfor de la primera avaluació: gris sense dades, vermell si hi ha RA suspesos o impossibles, groc si cal esforç, verd si va bé. */
export function firstEvaluationColor(input: FirstEvaluationInput): TrafficColor {
  if (input.coverage <= 0 || (input.provisional && !input.ras.some(r => r.state === "no-assolit"))) return "gris";
  const inProgress = input.ras.filter(r => r.state === "en-curs" && r.coverage > 0).map(classifyRaInProgress);
  if (input.status === "no-superat" || input.ras.some(r => r.state === "no-assolit") || inProgress.includes("impossible")) return "vermell";
  if (inProgress.some(c => c === "esforc" || c === "exigent") || input.projected < 6) return "groc";
  return "verd";
}

const TEXT_CLOSING: Record<TrafficColor, string> = {
  verd: "Cal mantenir el bon ritme de treball fins al final del mòdul per consolidar els resultats.",
  groc: "Encara hi ha marge per millorar: amb constància i lliurant totes les activitats es pot arribar a assolir tot el que queda.",
  vermell: "Encara hi ha temps per capgirar la situació: amb constància, lliurant totes les activitats i demanant suport al professorat quan faci falta, és possible aconseguir-ho.",
  gris: "",
};
const TEXT = {
  sense: "Encara no hi ha prou activitats avaluades per valorar els resultats d'aprenentatge; es farà un seguiment en les properes setmanes.",
  tancament: TEXT_CLOSING,
};

/**
 * Comentari individual de la primera avaluació: parla dels RA ja assolits, de com va cada RA en curs (nota actual i què en falta
 * per avaluar) i, si n'hi ha, dels RA que cal recuperar. Sempre en positiu, concret i sense gènere.
 */
export function firstEvaluationComment(input: FirstEvaluationInput, options: {closing?: boolean} = {}): string {
  const color = firstEvaluationColor(input);
  if (color === "gris") return TEXT.sense;
  const achieved = input.ras.filter(r => r.state === "assolit");
  const failed = input.ras.filter(r => r.state === "no-assolit");
  const inProgress = input.ras.filter(r => r.state === "en-curs");
  const groups: Record<Class, RaProgress[]> = {"no-comencat": [], assegurat: [], "bon-ritme": [], esforc: [], exigent: [], impossible: []};
  for (const ra of inProgress) groups[classifyRaInProgress(ra)].push(ra);
  const parts: string[] = [];

  if (achieved.length) parts.push(`Ha assolit ${achieved.length > 1 ? "els resultats d'aprenentatge" : "el resultat d'aprenentatge"} ${list(achieved.map(r => r.code))}.`);

  const progress = (ra: RaProgress) => `${ra.code} (nota ${ra.score === null ? "—" : n1(ra.score)}, queda un ${pct(100 - ra.coverage)} per avaluar)`;
  if (groups.assegurat.length) parts.push(`${list(groups.assegurat.map(r => r.code))} ${groups.assegurat.length > 1 ? "tenen" : "té"} l'aprovat assegurat amb el que ja s'ha avaluat.`);
  if (groups["bon-ritme"].length) parts.push(groups["bon-ritme"].length > 2
    ? `${list(groups["bon-ritme"].map(r => r.code))} van ben encaminats i s'assoliran mantenint el ritme actual.`
    : `${list(groups["bon-ritme"].map(progress))} ${groups["bon-ritme"].length > 1 ? "van ben encaminats" : "va ben encaminat"} i ${groups["bon-ritme"].length > 1 ? "s'assoliran" : "s'assolirà"} mantenint el ritme actual.`);
  for (const ra of [...groups.esforc, ...groups.exigent]) {
    const hard = classifyRaInProgress(ra) === "exigent";
    parts.push(`${progress(ra)}: cal una mitjana d'aproximadament un ${n1(ra.needed ?? 0)} en el que queda per assolir-lo; ${hard ? "és exigent, però encara és possible si s'hi posa esforç ja des d'ara" : "hi ha marge, però cal dedicar-hi més esforç"}.`);
  }
  if (groups.impossible.length) parts.push(`${list(groups.impossible.map(r => r.code))} ${groups.impossible.length > 1 ? "no es poden assolir" : "no es pot assolir"} només amb les activitats que queden; convé preparar-ne la recuperació amb constància.`);
  if (groups["no-comencat"].length) parts.push(`${list(groups["no-comencat"].map(r => r.code))} ${groups["no-comencat"].length > 1 ? "encara no s'han començat a avaluar" : "encara no s'ha començat a avaluar"}; hi ha temps per treballar-${groups["no-comencat"].length > 1 ? "los" : "lo"} amb regularitat.`);
  if (failed.length) {
    const byRequired = failed.filter(r => r.requiredFailed).map(r => r.code);
    parts.push(`${list(failed.map(r => r.code))} ${failed.length > 1 ? "no s'han assolit" : "no s'ha assolit"} de moment${byRequired.length ? `, perquè hi ha una activitat obligatòria pendent de superar` : ""}, però encara hi ha oportunitats de recuperar-${failed.length > 1 ? "los" : "lo"}: cal preparar-ne la recuperació.`);
  }
  if (!achieved.length && !inProgress.length && !failed.length) return TEXT.sense;
  if (options.closing !== false) parts.push(TEXT.tancament[color]);
  return parts.join(" ");
}

/** Dades de cada RA d'un alumne: l'estat (el mateix que a l'informe de l'alumne) i les xifres del càlcul. */
export function raProgressOf(course: AcademicCourse, group: Group, enrollmentId: string): {summary: ReturnType<typeof summarizeStudent>; ras: RaProgress[]; minGrade: number} {
  const cfg = course.configuration, minGrade = cfg.requiredActivityMinGrade;
  const summary = summarizeStudent(course, group, enrollmentId), calc = calculateStudent(course, group, enrollmentId);
  const ras = summary.ras.map((r): RaProgress => {
    const id = cfg.learningResults.find(x => x.code === r.code)?.id;
    const entry = id ? calc.learningResults.get(id) : undefined;
    const coverage = entry?.coverage ?? 0, remaining = 1 - coverage / 100;
    // Nota final aproximada = nota actual × part avaluada + mitjana futura × part que falta; se'n despeja la mitjana futura per arribar al mínim.
    const needed = r.state === "en-curs" && entry && coverage > 0 && remaining > 0.001 ? Math.round(((minGrade - entry.score * (coverage / 100)) / remaining) * 10) / 10 : null;
    return {code: r.code, state: r.state, score: entry && coverage > 0 ? entry.score : null, coverage, needed, requiredFailed: r.requiredFailed, belowMin: !!entry && coverage > 0 && entry.score < minGrade};
  });
  return {summary, ras, minGrade};
}

/** Una fila per alumne actiu, ordenada per cognoms, amb el semàfor i el comentari de la primera avaluació. */
export function buildFirstEvaluation(course: AcademicCourse, group: Group): PreevaluationRow[] {
  return group.enrollments.filter(e => e.status === "active").map(e => {
    const name = group.students.find(s => s.id === e.studentId)?.name ?? "—";
    const {summary, ras, minGrade} = raProgressOf(course, group, e.id);
    const input: FirstEvaluationInput = {coverage: summary.coverage, provisional: summary.provisional, status: summary.status, projected: summary.projected, minGrade, ras};
    const color = firstEvaluationColor(input);
    return {enrollmentId: e.id, name: name.replace(/\s+,/g, ",").toLocaleUpperCase("ca"), color, comment: firstEvaluationComment(input), short: firstEvaluationComment(input, {closing: false}), closing: firstEvaluationClosing(color)};
  }).sort((a, b) => a.name.localeCompare(b.name, "ca"));
}

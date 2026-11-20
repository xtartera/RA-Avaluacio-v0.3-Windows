import {finalInteger} from "./calculation.ts";
import type {TrafficColor} from "./currentEvidence.ts";
import type {AcademicCourse, Group} from "./domain.ts";
import {raProgressOf, type RaProgress} from "./firstEvaluation.ts";
import type {PreevaluationRow} from "./preevaluation.ts";
import type {SummaryStatus} from "./studentSummary.ts";
import type {StudentTrend} from "./trend.ts";

export interface SecondEvaluationInput {
  /** Percentatge del mòdul ja avaluat. */
  coverage: number;
  provisional: boolean;
  status: SummaryStatus;
  projected: number;
  minGrade: number;
  /** Llindar d'arrodoniment de la nota final (p. ex. 0,75). */
  roundingThreshold: number;
  ras: RaProgress[];
  trend?: StudentTrend | null;
}

const list = (items: string[]) => items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} i ${items[items.length - 1]}`;
const n1 = (v: number) => v.toFixed(1).replace(".", ",");

/** Semàfor de la 2a avaluació: verd = supera el mòdul; groc = el supera just o amb RA per tancar; vermell = no el supera; gris = sense dades. */
export function secondEvaluationColor(input: SecondEvaluationInput): TrafficColor {
  const failing = input.ras.some(r => r.state === "no-assolit");
  if (input.coverage <= 0 || (input.provisional && !failing)) return "gris";
  if (input.status === "no-superat" || failing) return "vermell";
  if (input.status === "superat" && input.projected >= 6 && !input.ras.some(r => r.state === "en-curs")) return "verd";
  return "groc";
}

const CLOSING: Record<TrafficColor, string> = {
  verd: "Felicitats pel resultat i per l'esforç al llarg del curs.",
  groc: "El resultat és just: convé consolidar els continguts per no perdre el ritme.",
  vermell: "Encara hi ha una oportunitat real: la convocatòria extraordinària permet recuperar els resultats d'aprenentatge pendents, i amb treball constant, ganes i el suport del professorat és possible superar el mòdul.",
  gris: "",
};
/** Missatge de tancament segons el semàfor (a l'acta de tots els mòduls es posa un sol cop per alumne). */
export const secondEvaluationClosing = (color: TrafficColor): string => CLOSING[color];

/**
 * Comentari individual de la 2a avaluació: ja és determinant. Diu si el mòdul se supera i, si no, quins RA falten i per què,
 * amb un to realista però sempre amb una sortida (la convocatòria extraordinària) i sense dramatitzar de més.
 */
export function secondEvaluationComment(input: SecondEvaluationInput, options: {closing?: boolean} = {}): string {
  const color = secondEvaluationColor(input);
  if (color === "gris") return "Encara no hi ha prou activitats avaluades per determinar el resultat del mòdul.";
  const total = input.ras.length;
  const achieved = input.ras.filter(r => r.state === "assolit");
  const failed = input.ras.filter(r => r.state === "no-assolit");
  const open = input.ras.filter(r => r.state === "en-curs");
  const parts: string[] = [];

  const complete = open.length === 0 && input.coverage >= 95;
  if (!failed.length && input.status === "superat" && !complete) {
    parts.push(`De moment el mòdul va aprovat (nota projectada de ${n1(input.projected)}), però encara queda per tancar ${open.length ? list(open.map(r => r.code)) : "part de l'avaluació"}: cal completar-ho per formalitzar el resultat final.`);
  } else if (!failed.length && input.status === "superat") {
    const grade = finalInteger(input.projected, input.roundingThreshold);
    const level = input.projected >= 9 ? "una nota excel·lent" : input.projected >= 7 ? "una bona nota" : "una nota justa però suficient";
    parts.push(`Ha superat el mòdul amb ${level} (${grade}), havent assolit ${total > 1 ? "tots els resultats d'aprenentatge" : "el resultat d'aprenentatge"} avaluats.`);
    if (input.trend?.direction === "puja") parts.push("Cal destacar la progressió positiva al llarg del curs.");
  } else {
    parts.push(`No supera el mòdul de moment: ${failed.length > 1 ? "els resultats d'aprenentatge" : "el resultat d'aprenentatge"} ${list(failed.map(r => r.code))} ${failed.length > 1 ? "no s'han assolit" : "no s'ha assolit"}.`);
    if (achieved.length) parts.push(`Cal valorar, però, que ha assolit ${list(achieved.map(r => r.code))}.`);
    const byRequired = failed.filter(r => r.requiredFailed).map(r => r.code), byGrade = failed.filter(r => !r.requiredFailed).map(r => r.code);
    const reasons: string[] = [];
    if (byRequired.length) reasons.push(`${list(byRequired)}, per activitats obligatòries pendents de superar`);
    if (byGrade.length) reasons.push(`${list(byGrade)}, perquè la nota no arriba al mínim (${input.minGrade})`);
    if (reasons.length) parts.push(`${reasons.length > 1 ? "Motius" : "Motiu"}: ${reasons.join("; ")}.`);
    if (total && failed.length / total >= 0.5) parts.push("La situació és complicada: la recuperació exigirà un esforç important i regular.");
    else if (failed.length <= 2) parts.push("És un resultat recuperable amb una dedicació concreta als RA pendents.");
    if (!byRequired.length && input.projected >= input.minGrade - 0.5) parts.push(`La nota global (${n1(input.projected)}) és propera al mínim: un petit esforç addicional a la recuperació pot ser suficient.`);
    if (open.length) parts.push(`A més, queda per tancar ${list(open.map(r => r.code))}.`);
  }
  if (options.closing !== false) parts.push(CLOSING[color]);
  return parts.join(" ");
}

/** Una fila per alumne actiu, ordenada per cognoms, amb el semàfor i el comentari de la 2a avaluació. */
export function buildSecondEvaluation(course: AcademicCourse, group: Group): PreevaluationRow[] {
  return group.enrollments.filter(e => e.status === "active").map(e => {
    const name = group.students.find(s => s.id === e.studentId)?.name ?? "—";
    const {summary, ras, minGrade} = raProgressOf(course, group, e.id);
    const input: SecondEvaluationInput = {
      coverage: summary.coverage, provisional: summary.provisional, status: summary.status, projected: summary.projected,
      minGrade, roundingThreshold: course.configuration.roundingThreshold ?? 0.75, ras, trend: summary.trend
    };
    const color = secondEvaluationColor(input);
    return {
      enrollmentId: e.id, name: name.replace(/\s+,/g, ",").toLocaleUpperCase("ca"), color,
      comment: secondEvaluationComment(input), short: secondEvaluationComment(input, {closing: false}), closing: secondEvaluationClosing(color)
    };
  }).sort((a, b) => a.name.localeCompare(b.name, "ca"));
}

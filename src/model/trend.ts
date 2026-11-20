import {activityIsEvaluated, totalGrade} from "./calculation.ts";
import type {AcademicCourse, Group} from "./domain.ts";

/**
 * Evolució d'un alumne en un mòdul: els resultats de les últimes activitats avaluades comparats amb els de les anteriors.
 * Es recalcula amb les dades actuals, així que els comentaris canvien a mesura que es corregeixen més activitats.
 */
export interface StudentTrend {
  direction: "puja" | "estable" | "baixa";
  /** Mitjana de les últimes activitats menys la de les anteriors. */
  delta: number;
  recent: number;
  previous: number;
  /** Nombre d'activitats avaluades que hi entren. */
  n: number;
  /** Nivell actual (mitjana de les últimes activitats): alt (7 o més), mitjà (de 5 a 7) o baix. */
  level: "alt" | "mitja" | "baix";
}

export const MIN_ACTIVITIES_FOR_TREND = 4;
/** Diferència mínima (en punts) per parlar de pujada o de baixada. */
export const TREND_THRESHOLD = 1;

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

/** Tendència a partir d'una successió de notes en ordre cronològic (null si n'hi ha massa poques). */
export function trendOfScores(scores: number[]): StudentTrend | null {
  if (scores.length < MIN_ACTIVITIES_FOR_TREND) return null;
  const k = Math.max(2, Math.floor(scores.length / 3));
  const recent = mean(scores.slice(scores.length - k)), previous = mean(scores.slice(0, scores.length - k));
  const delta = recent - previous;
  return {
    direction: delta >= TREND_THRESHOLD ? "puja" : delta <= -TREND_THRESHOLD ? "baixa" : "estable",
    delta, recent, previous, n: scores.length,
    level: recent >= 7 ? "alt" : recent >= 5 ? "mitja" : "baix",
  };
}

/** Evolució d'un alumne amb les activitats ordinàries ja avaluades del grup; una activitat sense lliurar compta 0. */
export function studentTrend(course: AcademicCourse, group: Group, enrollmentId: string): StudentTrend | null {
  const activities = course.configuration.activities
    .filter(a => a.status === "active" && a.session === "ordinaria" && activityIsEvaluated(group, a.id))
    .sort((a, b) => a.term - b.term || a.order - b.order);
  const scores = activities.map(a => totalGrade(group.grades.find(g => g.enrollmentId === enrollmentId && g.activityId === a.id)) ?? 0);
  return trendOfScores(scores);
}

const n1 = (v: number) => v.toFixed(1).replace(".", ",");
const list = (items: string[]) => items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} i ${items[items.length - 1]}`;

/** Frase en positiu sobre l'evolució d'un mòdul; si els resultats baixen, reforça l'esforç i les ganes. */
export function trendSentence(trend: StudentTrend | null | undefined): string {
  if (!trend) return "";
  const {recent, previous} = trend;
  if (trend.direction === "puja") return `L'evolució és molt positiva: en les últimes activitats la mitjana és de ${n1(recent)}, per sobre de la de les anteriors (${n1(previous)}). Això demostra que l'esforç dona fruits; cal continuar amb aquesta dinàmica.`;
  if (trend.direction === "baixa") {
    if (trend.level === "alt") return `Hi ha hagut una lleugera baixada en les últimes activitats (de ${n1(previous)} a ${n1(recent)}), però els resultats continuen sent bons; cal mantenir l'esforç i les ganes perquè no s'afluixi el ritme.`;
    return `En les últimes activitats els resultats han baixat (de ${n1(previous)} a ${n1(recent)}), però és una tendència que es pot revertir: amb esforç, constància i ganes de millorar, i demanant ajuda quan faci falta, es poden recuperar i superar els resultats anteriors.`;
  }
  if (trend.level === "alt") return `Mostra regularitat en els resultats (mitjana de ${n1(recent)} en les últimes activitats): una bona base per anar consolidant el que queda.`;
  if (trend.level === "mitja") return `Els resultats es mantenen estables (${n1(recent)} en les últimes activitats); amb una mica més d'esforç i de constància hi ha marge per millorar-los.`;
  return `Els resultats es mantenen en un ${n1(recent)}, per sota del mínim, però encara hi ha temps per canviar-ho: amb ganes, constància i demanant suport quan calgui es pot remuntar.`;
}

/** Frase conjunta de l'evolució en tots els mòduls on hi ha prou activitats avaluades. */
export function jointTrendSentence(entries: {abbreviation: string; trend: StudentTrend | null | undefined}[]): string {
  const known = entries.filter((e): e is {abbreviation: string; trend: StudentTrend} => !!e.trend);
  if (!known.length) return "";
  const up = known.filter(e => e.trend.direction === "puja").map(e => e.abbreviation);
  const down = known.filter(e => e.trend.direction === "baixa").map(e => e.abbreviation);
  const where = (names: string[]) => names.length === known.length ? "en tots els mòduls" : `a ${list(names)}`;
  if (up.length && !down.length) return `L'evolució és positiva ${where(up)}: els resultats més recents milloren els anteriors. Cal continuar amb aquest esforç.`;
  if (down.length && !up.length) return `${down.length === known.length ? "En tots els mòduls" : `A ${list(down)}`} els últims resultats han baixat, però és una tendència que es pot revertir: amb esforç, constància i ganes de millorar es pot recuperar el ritme.`;
  if (up.length && down.length) return `L'evolució és positiva a ${list(up)}; a ${list(down)} els últims resultats han baixat, i és on convé posar-hi més esforç i ganes per recuperar el ritme.`;
  const low = known.filter(e => e.trend.level === "baix").map(e => e.abbreviation);
  if (low.length) return `Els resultats es mantenen estables, però ${where(low)} per sota del mínim: amb ganes i constància encara hi ha temps per remuntar.`;
  return "Els resultats es mantenen estables; amb una mica més d'esforç i de constància hi ha marge per anar millorant.";
}

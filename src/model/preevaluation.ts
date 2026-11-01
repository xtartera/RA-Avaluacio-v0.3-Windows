import {analyzeCurrentEvidence, type CurrentEvidence, type TrafficColor} from "./currentEvidence.ts";
import type {AcademicCourse, Group} from "./domain.ts";

export interface PreevaluationRow {
  enrollmentId: string;
  /** «COGNOMS, NOM» en majúscules, com a l'acta. */
  name: string;
  color: TrafficColor;
  comment: string;
}

/**
 * Banc de frases de la preavaluació, a l'estil de les actes d'altres anys. Genèriques i sense dades de context:
 * només parlen de resultats, lliuraments i implicació observada a l'aula; mai de factors ni de la nota breu.
 */
const TEXT = {
  sense: "Encara no hi ha prou activitats corregides per valorar el rendiment; es farà un seguiment en les properes setmanes.",
  excel: "En l'àmbit acadèmic, ha assolit amb èxit els continguts treballats fins ara, mostrant una bona comprensió i aplicació dels coneixements. Aquesta solidesa en els resultats és fruit de la constància i l'organització.",
  correcte: "Els resultats són correctes i segueix bé el ritme de la classe. Cal mantenir la constància i continuar treballant amb regularitat.",
  potencial: "Té capacitat per obtenir bons resultats, però no sempre lliura totes les activitats. Cal mantenir la constància en els lliuraments per consolidar el seu nivell.",
  potencialGroc: "Tot i tenir potencial per obtenir millors resultats, no sempre lliura les activitats proposades. Necessita treballar amb més regularitat per aconseguir resultats acadèmics més consistents.",
  participacio: "Tot i la seva participació a l'aula, els resultats acadèmics són discrets. Necessita més temps de dedicació a les tasques per consolidar els aprenentatges.",
  constancia: "Necessita treballar amb més constància per consolidar els coneixements i millorar els seus resultats.",
  dificultats: "Li costa consolidar certs aprenentatges. Amb treball regular i suport addicional, estem segurs que millorarà.",
  esforc: "Per assolir els objectius acadèmics, és important que dediqui més temps i esforç a l'estudi i a les tasques diàries.",
  habits: "Té dificultats per assolir els objectius plantejats. És important establir hàbits d'estudi i reforçar els continguts amb suport addicional.",
  obligatoris: "Té pendent superar els exàmens obligatoris, imprescindibles per assolir els resultats d'aprenentatge.",
  autonomia: "Cal treballar l'autonomia i la implicació a l'aula.",
  baixa: "En les últimes activitats el rendiment ha anat a la baixa.",
  millora: "Cal destacar la millora en les últimes activitats.",
};

/** Comentari genèric d'un alumne a partir de les seves dades (una a tres frases). */
export function preevaluationComment(ev: CurrentEvidence | null, observation?: {levels: Partial<Record<string, number>>}): string {
  if (!ev || ev.traffic.color === "gris" || ev.average === null) return TEXT.sense;
  const parts: string[] = [];
  const delivered = ev.deliveryPct, byWork = ev.averageDelivered ?? ev.average;
  const implication = observation?.levels.implicacio, autonomy = observation?.levels.autonomia;
  const color = ev.traffic.color;
  if (color === "verd") {
    parts.push(ev.average >= 8.5 && delivered >= 90 ? TEXT.excel : delivered < 90 ? TEXT.potencial : TEXT.correcte);
  } else if (color === "groc") {
    if (byWork >= 7 && delivered < 80) parts.push(TEXT.potencialGroc);
    else if (implication !== undefined && implication >= 3) parts.push(TEXT.participacio);
    else if (byWork < 6 && delivered >= 80) parts.push(TEXT.dificultats);
    else parts.push(TEXT.constancia);
  } else {
    if (ev.required.failed) parts.push(TEXT.obligatoris);
    parts.push(delivered < 50 ? TEXT.esforc : TEXT.habits);
  }
  if (color !== "verd" && ((autonomy !== undefined && autonomy <= 2) || (implication !== undefined && implication <= 2))) parts.push(TEXT.autonomia);
  if (ev.trend && ev.trend.delta <= -2.5) parts.push(TEXT.baixa);
  else if (ev.trend && ev.trend.delta >= 1 && color !== "verd") parts.push(TEXT.millora);
  return parts.join(" ");
}

/** Una fila per alumne actiu, ordenada per cognoms, amb el color del semàfor i el comentari genèric. */
export function buildPreevaluation(course: AcademicCourse, group: Group): PreevaluationRow[] {
  return group.enrollments.filter(e => e.status === "active").map(e => {
    const student = group.students.find(s => s.id === e.studentId);
    const name = student?.name ?? "—";
    const observation = group.observations.find(o => o.enrollmentId === e.id);
    const ev = analyzeCurrentEvidence(course, group, e.id, name, {unitId: null, observation});
    return {enrollmentId: e.id, name: name.replace(/\s+,/g, ",").toLocaleUpperCase("ca"), color: (ev?.traffic.color ?? "gris") as TrafficColor, comment: preevaluationComment(ev, observation)};
  }).sort((a, b) => a.name.localeCompare(b.name, "ca"));
}

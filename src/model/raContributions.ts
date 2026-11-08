import {activityIsEvaluated, activityShareInRa, totalGrade} from "./calculation.ts";
import {countsForGrade, type AcademicCourse, type Group} from "./domain.ts";

export interface RaContribution {
  activityId: string;
  name: string;
  typeId: string;
  unitName: string;
  /** Pes de la tasca dins de l'RA (0..1; suma 1 entre totes les tasques vinculades). */
  share: number;
  /** Nota de l'alumne; null si encara no en té. Un «No presentat» compta 0. */
  grade: number | null;
  /** L'activitat ja està corregida al grup. */
  evaluated: boolean;
}

export interface RaContributions {
  raId: string;
  code: string;
  description: string;
  parts: RaContribution[];
  /** Nota acumulada de l'RA: Σ pes × nota, amb el que no té nota comptat 0. És la nota de la graella. */
  earned: number;
  /** Part de l'RA (0..1) que ja té nota. */
  graded: number;
}

/** Aportació de cada tasca a cada RA per a un alumne, en l'ordre de les UT. Base de la visualització «El meu RA». */
export function raContributions(course: AcademicCourse, group: Group, enrollmentId: string): RaContributions[] {
  const cfg = course.configuration;
  const order = new Map<string, number>(), unitOf = new Map<string, string>();
  cfg.workUnits.filter(u => u.status === "active").sort((a, b) => a.order - b.order).forEach((u, ui) => u.activityIds.forEach(id => { if (!order.has(id)) { order.set(id, ui * 1000 + (cfg.activities.find(a => a.id === id)?.order ?? 0)); unitOf.set(id, u.name); } }));
  const activities = new Map(cfg.activities.filter(a => a.status === "active" && a.session === "ordinaria" && countsForGrade(a)).map(a => [a.id, a]));
  return cfg.learningResults.filter(r => r.status === "active").sort((a, b) => a.order - b.order).map(r => {
    const shares = activityShareInRa(course, r.id);
    const parts: RaContribution[] = [...shares].filter(([id, share]) => share > 0 && activities.has(id)).map(([id, share]) => {
      const grade = group.grades.find(g => g.enrollmentId === enrollmentId && g.activityId === id);
      const value = grade?.status === "not_presented" ? 0 : grade?.status === "graded" ? totalGrade(grade) : null;
      return {activityId: id, name: activities.get(id)!.name, typeId: activities.get(id)!.activityTypeId, unitName: unitOf.get(id) ?? "Sense UT", share, grade: value, evaluated: activityIsEvaluated(group, id)};
    }).sort((a, b) => (order.get(a.activityId) ?? 1e6) - (order.get(b.activityId) ?? 1e6));
    return {raId: r.id, code: r.code, description: r.description, parts, earned: parts.reduce((s, p) => s + p.share * (p.grade ?? 0), 0), graded: parts.filter(p => p.grade !== null).reduce((s, p) => s + p.share, 0)};
  });
}

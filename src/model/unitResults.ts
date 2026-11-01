import {activityIsEvaluated, calculateStudent, finalInteger, totalGrade} from "./calculation.ts";
import {analyzeCurrentEvidence, listUnits} from "./currentEvidence.ts";
import {countsForGrade, type AcademicCourse, type Group} from "./domain.ts";

export type UnitStatus = "superada" | "no-superada" | "en-curs" | "sense-dades";
export type RaOutcome = "superat" | "suspes" | "en-curs" | "sense-dades" | "sense-ut";

export interface UnitRequired {name: string; grade: number | null; passed: boolean | null}

export interface UnitRaResult {
  code: string;
  description: string;
  /** Nota estimada sobre el que ja està avaluat de TOTES les activitats vinculades a l'RA (també les d'altres UT). */
  estimated: number | null;
  /** Mínim garantit: el que encara no té nota (també d'altres UT) compta 0. */
  accumulated: number;
  /** Percentatge del pes de l'RA ja avaluat; la resta són activitats encara sense corregir. */
  coverage: number;
  /** Resultat d'aquest RA a la UT que el tanca, decidit per separat dels altres RA de la UT. */
  outcome: Exclude<RaOutcome, "sense-ut">;
  /** Motiu del resultat; amb xifres, només per a la pantalla del professorat. */
  reason: string;
  /** Les obligatòries de la UT no estan superades (és la causa del suspens, no la nota). */
  failedRequired: boolean;
}

export interface UnitResult {
  unitId: string;
  unitName: string;
  status: UnitStatus;
  /** Motiu de l'estat, en una frase. */
  reason: string;
  required: UnitRequired[];
  totalActivities: number;
  corrected: number;
  delivered: number;
  /** Activitats corregides de la UT amb 0, en blanc o no presentades. */
  notDelivered: string[];
  /** Nota de la UT: mitjana de la nota dels RA que tanca (només orientativa quan en tanca més d'un). */
  nota: number | null;
  /** Mitjana plana de les activitats corregides de la UT (un 0 hi compta). Només informativa: no decideix res. */
  average: number | null;
  ras: UnitRaResult[];
}

const fmt = (n: number) => n.toLocaleString("ca", {minimumFractionDigits: 1, maximumFractionDigits: 1});

/**
 * Criteri únic, el del càlcul de la graella de RA (nota estimada, obligatòries suspeses i cobertura mínima): cada UT decideix els RA que tanca, cadascun per separat. Un RA se supera si totes les obligatòries de la UT
 * tenen la nota mínima (sense arrodonir) i la nota de l'RA —calculada amb totes les activitats vinculades ja corregides,
 * de qualsevol UT— arrodonida amb el llindar de configuració és de 5 o més. Una UT se supera si tots els seus RA se superen.
 * Mentre falti corregir alguna activitat de la UT, és «en curs», tret que ja hi hagi una obligatòria suspesa.
 */
export function analyzeUnitResults(course: AcademicCourse, group: Group, enrollmentId: string, name: string): UnitResult[] {
  const cfg = course.configuration, min = cfg.requiredActivityMinGrade, calc = calculateStudent(course, group, enrollmentId);
  const ordinary = cfg.activities.filter(a => a.status === "active" && a.session === "ordinaria" && countsForGrade(a));
  return listUnits(course).map(unit => {
    const acts = ordinary.filter(a => unit.activityIds.includes(a.id));
    const evaluated = acts.filter(a => activityIsEvaluated(group, a.id));
    const ev = analyzeCurrentEvidence(course, group, enrollmentId, name, {unitId: unit.id});
    const required: UnitRequired[] = unit.requiredActivityIds.map(id => ordinary.find(a => a.id === id)).filter((a): a is NonNullable<typeof a> => !!a).map(a => {
      const grade = group.grades.find(g => g.enrollmentId === enrollmentId && g.activityId === a.id);
      if (grade?.status === "not_presented") return {name: a.name, grade: null, passed: false};
      const total = grade?.status === "graded" ? totalGrade(grade) : null;
      return {name: a.name, grade: total, passed: total === null ? null : total >= min};
    });
    const failed = required.filter(r => r.passed === false);
    const failedText = `cal recuperar ${failed.map(r => `${r.name}${r.grade === null ? "" : ` (${fmt(r.grade)})`}`).join(", ")}`;
    const complete = evaluated.length === acts.length && !required.some(r => r.passed === null);
    const missing = `falten ${acts.length - evaluated.length} activitats per corregir`;

    const ras: UnitRaResult[] = cfg.learningResults.filter(r => r.status === "active" && unit.learningResultIds.includes(r.id)).map(r => {
      const x = calc.learningResults.get(r.id);
      const estimated = x && x.coverage > 0 ? x.score : null;
      let outcome: UnitRaResult["outcome"], reason: string;
      if (!evaluated.length) { outcome = "sense-dades"; reason = "encara sense activitats corregides"; }
      else if (failed.length) { outcome = "suspes"; reason = failedText; }
      else if (x && x.failingActivities > 0) { outcome = "suspes"; reason = "hi ha una obligatòria suspesa que decideix aquest RA"; }
      else if (!complete) { outcome = "en-curs"; reason = missing; }
      else if (estimated === null) { outcome = "en-curs"; reason = "l'RA encara no té activitats corregides"; }
      else if (x?.provisional) { outcome = "en-curs"; reason = `provisional: només s'ha avaluat el ${Math.round(x.coverage)} % de l'RA`; }
      else if (finalInteger(estimated, cfg.roundingThreshold) < min) { outcome = "suspes"; reason = `la nota de l'RA és ${fmt(estimated)} (menys de ${min})`; }
      else { outcome = "superat"; reason = required.length ? "obligatòries superades i nota de l'RA correcta" : "nota de l'RA correcta"; }
      return {code: r.code, description: r.description, estimated, accumulated: x?.accumulated ?? 0, coverage: x?.coverage ?? 0, outcome, reason, failedRequired: failed.length > 0};
    });

    let status: UnitStatus, reason: string;
    if (!evaluated.length) { status = "sense-dades"; reason = "encara sense activitats corregides"; }
    else if (!ras.length) {
      // UT sense RA associats: només decideixen les obligatòries.
      if (failed.length) { status = "no-superada"; reason = failedText; } else if (!complete) { status = "en-curs"; reason = missing; } else { status = "superada"; reason = "obligatòries superades"; }
    } else if (ras.some(a => a.outcome === "suspes")) { status = "no-superada"; reason = [...new Set(ras.filter(a => a.outcome === "suspes").map(a => failed.length ? a.reason : `${a.code}: ${a.reason}`))].join("; "); }
    else if (ras.every(a => a.outcome === "superat")) { status = "superada"; reason = required.length ? "obligatòries superades i nota dels RA correcta" : "nota dels RA correcta"; }
    else { status = "en-curs"; reason = missing; }

    const notes = ras.map(a => a.estimated).filter((n): n is number => n !== null);
    return {unitId: unit.id, unitName: unit.name, status, reason, required, totalActivities: acts.length, corrected: evaluated.length, delivered: ev?.delivered ?? 0, notDelivered: ev?.activities.filter(a => !a.delivered).map(a => a.name) ?? [], nota: notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : null, average: ev?.average ?? null, ras};
  });
}

/** Resultat global d'un RA a partir del que decideix cada UT que el tanca: suspès si alguna el suspèn, superat si totes el superen. */
export function raOutcome(outcomes: Exclude<RaOutcome, "sense-ut">[]): RaOutcome {
  if (!outcomes.length) return "sense-ut";
  if (outcomes.includes("suspes")) return "suspes";
  if (outcomes.every(s => s === "superat")) return "superat";
  if (outcomes.every(s => s === "sense-dades")) return "sense-dades";
  return "en-curs";
}

export interface GroupUnitRow {
  enrollmentId: string;
  name: string;
  units: UnitResult[];
  ras: {code: string; description: string; outcome: RaOutcome; nota: number | null; reason: string; unitNames: string[]}[];
}

/** Una fila per alumne actiu del grup: resultat de cada UT i de cada RA. */
export function analyzeGroupUnits(course: AcademicCourse, group: Group): GroupUnitRow[] {
  const cfg = course.configuration, units = listUnits(course);
  return group.enrollments.filter(e => e.status === "active").map(e => {
    const name = group.students.find(s => s.id === e.studentId)?.name ?? "—";
    const results = analyzeUnitResults(course, group, e.id, name);
    const ras = cfg.learningResults.filter(r => r.status === "active").sort((a, b) => a.order - b.order).map(r => {
      const closing = units.filter(u => u.learningResultIds.includes(r.id));
      const mine = closing.map(u => results.find(x => x.unitId === u.id)?.ras.find(a => a.code === r.code)).filter((a): a is UnitRaResult => !!a);
      return {code: r.code, description: r.description, outcome: raOutcome(mine.map(a => a.outcome)), nota: mine[0]?.estimated ?? null, reason: mine.find(a => a.outcome === "suspes")?.reason ?? mine[0]?.reason ?? "", unitNames: closing.map(u => u.name)};
    });
    return {enrollmentId: e.id, name, units: results, ras};
  }).sort((a, b) => a.name.localeCompare(b.name, "ca"));
}

import {activityIsEvaluated, calculateStudent, isDelivered, requiredGroupStatus} from "./calculation.ts";
import {analyzeCurrentEvidence, listUnits} from "./currentEvidence.ts";
import {countsForGrade, type AcademicCourse, type Group} from "./domain.ts";

export type UnitStatus = "superada" | "no-superada" | "en-curs" | "sense-dades";
export type RaOutcome = "superat" | "suspes" | "en-curs" | "sense-dades" | "sense-ut";

export interface UnitRequired {name: string; grade: number | null; passed: boolean | null}

export interface UnitRequiredSummary {mode: "individual" | "average"; average: number | null; passed: boolean | null}

export interface UnitRaResult {
  code: string;
  description: string;
  /** Nota estimada (referència) sobre el que ja està avaluat de TOTES les activitats vinculades a l'RA (també les d'altres UT). */
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
  /** Activitats ja corregides vinculades a l'RA que l'alumne no ha lliurat (0, en blanc o no presentades): baixen la nota de l'RA. */
  notDelivered: string[];
}

export interface UnitResult {
  unitId: string;
  unitName: string;
  status: UnitStatus;
  /** Motiu de l'estat, en una frase. */
  reason: string;
  required: UnitRequired[];
  /** Com es valoren les obligatòries (cadascuna o per la mitjana) i el resultat del conjunt. */
  requiredSummary: UnitRequiredSummary;
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
/** Nota de l'RA: dos decimals, com a la graella de resultats d'aprenentatge. */
const fmt2 = (n: number) => n.toLocaleString("ca", {minimumFractionDigits: 2, maximumFractionDigits: 2});

/**
 * Criteri únic, el de la graella de RA: la nota de l'RA és l'acumulada (el que encara no té nota compta 0). Un RA s'assoleix amb les
 * obligatòries aprovades i nota ≥ mínim; no s'assoleix si hi ha una obligatòria suspesa o, quan la UT que el tanca ja està tota corregida, la nota no arriba;
 * mentrestant és «en curs». Les activitats d'altres UT que encara no s'han corregit compten 0 a la nota acumulada. Cada UT decideix els RA que tanca, cadascun per separat; se supera si tots se superen.
 */
export function analyzeUnitResults(course: AcademicCourse, group: Group, enrollmentId: string, name: string): UnitResult[] {
  const cfg = course.configuration, min = cfg.requiredActivityMinGrade, calc = calculateStudent(course, group, enrollmentId);
  const ordinary = cfg.activities.filter(a => a.status === "active" && a.session === "ordinaria" && countsForGrade(a));
  return listUnits(course).map(unit => {
    const acts = ordinary.filter(a => unit.activityIds.includes(a.id));
    const evaluated = acts.filter(a => activityIsEvaluated(group, a.id));
    const ev = analyzeCurrentEvidence(course, group, enrollmentId, name, {unitId: unit.id});
    const rs = requiredGroupStatus(course, group, enrollmentId, unit);
    const required: UnitRequired[] = rs.items.map(i => ({name: i.name, grade: i.status === "not_presented" ? null : i.grade, passed: i.status === "pending" ? null : i.grade !== null && i.grade >= min}));
    // En mode mitjana, el que decideix és el conjunt: les obligatòries per sota del mínim no fan suspendre si la mitjana arriba.
    const failed = rs.failedIds.map(id => required[rs.items.findIndex(i => i.id === id)]).filter(Boolean);
    const failedText = rs.mode === "average" ? `la mitjana de les obligatòries és ${fmt(rs.average ?? 0)} (menys de ${min})` : `cal recuperar ${failed.map(r => `${r.name}${r.grade === null ? "" : ` (${fmt(r.grade)})`}`).join(", ")}`;
    const complete = evaluated.length === acts.length && rs.passed !== null;
    const missing = `falten ${acts.length - evaluated.length} activitats per corregir`;

    const ras: UnitRaResult[] = cfg.learningResults.filter(r => r.status === "active" && unit.learningResultIds.includes(r.id)).map(r => {
      const x = calc.learningResults.get(r.id);
      const estimated = x && x.coverage > 0 ? x.score : null;
      // La nota de l'RA és la de la graella (acumulada: el que encara no té nota compta 0).
      const nota = x?.accumulated ?? 0, coverage = x?.coverage ?? 0;
      const criteriaIds = new Set(cfg.criteria.filter(c => c.learningResultId === r.id).map(c => c.id));
      const linkedIds = new Set(cfg.links.filter(l => criteriaIds.has(l.criterionId)).map(l => l.activityId));
      const missingLinked = ordinary.filter(a => linkedIds.has(a.id) && activityIsEvaluated(group, a.id) && !isDelivered(group.grades.find(g => g.enrollmentId === enrollmentId && g.activityId === a.id))).map(a => a.name);
      let outcome: UnitRaResult["outcome"], reason: string;
      if (!evaluated.length) { outcome = "sense-dades"; reason = "encara sense activitats corregides"; }
      else if (failed.length) { outcome = "suspes"; reason = failedText; }
      else if (x && x.failingActivities > 0) { outcome = "suspes"; reason = "hi ha una obligatòria suspesa que decideix aquest RA"; }
      else if (nota >= min) { outcome = "superat"; reason = required.length ? "obligatòries superades i nota de l'RA correcta" : "nota de l'RA correcta"; }
      else if (!complete) { outcome = "en-curs"; reason = `de moment ${fmt2(nota)}; ${missing}`; }
      else { outcome = "suspes"; reason = `la UT està corregida i la nota de l'RA és ${fmt2(nota)} (menys de ${min})${missingLinked.length ? `; activitats sense lliurar que hi compten: ${missingLinked.join(", ")}` : ""}`; }
      return {code: r.code, description: r.description, estimated, accumulated: nota, coverage, outcome, reason, failedRequired: failed.length > 0 || !!(x && x.failingActivities > 0), notDelivered: missingLinked};
    });

    let status: UnitStatus, reason: string;
    if (!evaluated.length) { status = "sense-dades"; reason = "encara sense activitats corregides"; }
    else if (!ras.length) {
      // UT sense RA associats: només decideixen les obligatòries.
      if (failed.length) { status = "no-superada"; reason = failedText; } else if (!complete) { status = "en-curs"; reason = missing; } else { status = "superada"; reason = "obligatòries superades"; }
    } else if (ras.some(a => a.outcome === "suspes")) { status = "no-superada"; reason = [...new Set(ras.filter(a => a.outcome === "suspes").map(a => failed.length ? a.reason : `${a.code}: ${a.reason}`))].join("; "); }
    else if (ras.every(a => a.outcome === "superat")) { status = "superada"; reason = required.length ? "obligatòries superades i nota dels RA correcta" : "nota dels RA correcta"; }
    else { status = "en-curs"; reason = ras.find(a => a.outcome === "en-curs")?.reason ?? missing; }

    const notes = ras.filter(a => a.outcome !== "sense-dades").map(a => a.accumulated);
    return {unitId: unit.id, unitName: unit.name, status, reason, required, requiredSummary: {mode: rs.mode, average: rs.average, passed: rs.passed}, totalActivities: acts.length, corrected: evaluated.length, delivered: ev?.delivered ?? 0, notDelivered: ev?.activities.filter(a => !a.delivered).map(a => a.name) ?? [], nota: notes.length ? notes.reduce((s, n) => s + n, 0) / notes.length : null, average: ev?.average ?? null, ras};
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
      return {code: r.code, description: r.description, outcome: raOutcome(mine.map(a => a.outcome)), nota: mine[0]?.accumulated ?? null, reason: mine.find(a => a.outcome === "suspes")?.reason ?? mine[0]?.reason ?? "", unitNames: closing.map(u => u.name)};
    });
    return {enrollmentId: e.id, name, units: results, ras};
  }).sort((a, b) => a.name.localeCompare(b.name, "ca"));
}

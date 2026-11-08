import {calculateStudent, raIsAchieved, raIsFailing, requiredGroupStatus} from "./calculation.ts";
import {analyzeUnitResults, raOutcome} from "./unitResults.ts";
import type {AcademicCourse, Group} from "./domain.ts";

export type SummaryStatus = "superat" | "no-superat" | "pendent";
export type RaState = "assolit" | "no-assolit" | "en-curs";

export interface SummaryRa {
  code: string;
  description: string;
  state: RaState;
  /** Causes del «no assolit», sense cap nota: obligatòries no superades o nota de l'RA per sota del mínim. */
  causes: string[];
  /** Totes les activitats de la UT (o UT) que tanquen l'RA estan corregides: l'RA està avaluat completament. */
  evaluated: boolean;
  /** L'RA no s'assoleix per una activitat obligatòria suspesa (o la mitjana de les obligatòries per sota del mínim): la nota es pot amagar. */
  requiredFailed: boolean;
  /** UT que tanquen l'RA. */
  units: string[];
}

export interface StudentSummary {
  /** L'única nota que es mostra: la nota projectada del mòdul. */
  projected: number;
  coverage: number;
  provisional: boolean;
  status: SummaryStatus;
  /** Causes globals del «no superat» (sense notes). */
  causes: string[];
  ras: SummaryRa[];
  requiredFailed: string[];
}

/**
 * Resum per a l'alumne: la nota projectada del mòdul, l'estat de cada RA i, si no se supera, la causa.
 * No porta cap altra nota (mitjanes, estimades, acumulades ni notes d'activitats): només estats i motius.
 */
export function summarizeStudent(course: AcademicCourse, group: Group, enrollmentId: string): StudentSummary {
  const cfg = course.configuration, min = cfg.requiredActivityMinGrade, calc = calculateStudent(course, group, enrollmentId);
  const activities = new Map(cfg.activities.map(a => [a.id, a]));
  const failedRequiredOf = (raId: string) => {
    const names = new Set<string>();
    for (const unit of cfg.workUnits.filter(u => u.status === "active" && u.learningResultIds.includes(raId))) {
      const rs = requiredGroupStatus(course, group, enrollmentId, unit);
      // En mode mitjana, la causa és el conjunt de les obligatòries i no una activitat concreta.
      if (rs.mode === "average" && rs.passed === false) names.add("la mitjana de les obligatòries");
      else for (const id of rs.failedIds) names.add(activities.get(id)?.name ?? "obligatòria");
    }
    return [...names];
  };
  const studentName = group.students.find(x => x.id === group.enrollments.find(e => e.id === enrollmentId)?.studentId)?.name ?? "";
  const unitResults = analyzeUnitResults(course, group, enrollmentId, studentName);
  const ras0 = cfg.learningResults.filter(r => r.status === "active").sort((a, b) => a.order - b.order).map(r => {
    // Un RA tancat per una UT es decideix com a la pantalla «Resultats per UT»: mentre la UT no estigui corregida és «en curs».
    const closingUnits = unitResults.filter(u => cfg.workUnits.find(w => w.id === u.unitId)?.learningResultIds.includes(r.id));
    const closing = closingUnits.map(u => u.ras.find(x => x.code === r.code)).filter((x): x is NonNullable<typeof x> => !!x);
    const info = {evaluated: closingUnits.length > 0 && closingUnits.every(u => u.complete), units: closingUnits.map(u => u.unitName)};
    if (closing.length) {
      const outcome = raOutcome(closing.map(x => x.outcome));
      if (outcome === "superat") return {code: r.code, description: r.description, state: "assolit" as const, causes: [], ...info};
      if (outcome === "suspes") {
        const failed = failedRequiredOf(r.id), missing = [...new Set(closing.flatMap(x => x.notDelivered))];
        return {code: r.code, description: r.description, state: "no-assolit" as const, causes: failed.length ? [failed[0] === "la mitjana de les obligatòries" ? "la mitjana de les activitats obligatòries no arriba al mínim exigit" : `no s'ha superat l'activitat obligatòria ${failed.join(", ")}`] : [missing.length ? `la nota de l'RA no arriba al mínim exigit (${min}) perquè hi ha activitats sense lliurar que hi compten: ${missing.join(", ")}` : `la nota de l'RA no arriba al mínim exigit (${min})`], ...info};
      }
      return {code: r.code, description: r.description, state: "en-curs" as const, causes: [], ...info};
    }
    const entry = calc.learningResults.get(r.id);
    if (raIsAchieved(entry)) return {code: r.code, description: r.description, state: "assolit" as const, causes: [], ...info};
    if (raIsFailing(entry)) {
      const failed = failedRequiredOf(r.id);
      return {code: r.code, description: r.description, state: "no-assolit" as const, causes: failed.length ? [failed[0] === "la mitjana de les obligatòries" ? "la mitjana de les activitats obligatòries no arriba al mínim exigit" : `no s'ha superat l'activitat obligatòria ${failed.join(", ")}`] : [`la nota de l'RA no arriba al mínim exigit (${min})`], ...info};
    }
    return {code: r.code, description: r.description, state: "en-curs" as const, causes: [], ...info};
  });
  const ras: SummaryRa[] = ras0.map(r => ({...r, requiredFailed: r.state === "no-assolit" && failedRequiredOf(cfg.learningResults.find(x => x.code === r.code)!.id).length > 0}));
  const failing = ras.filter(r => r.state === "no-assolit");
  const provisional = calc.globalCoverage < (cfg.minRaCoverage ?? 25);
  const requiredFailed = [...new Set(failing.flatMap(r => failedRequiredOf(cfg.learningResults.find(x => x.code === r.code)!.id)))];
  const causes: string[] = [];
  if (requiredFailed.includes("la mitjana de les obligatòries")) causes.push("La mitjana de les activitats obligatòries no arriba al mínim exigit.");
  else if (requiredFailed.length) causes.push(`No s'han superat les activitats obligatòries: ${requiredFailed.join(", ")}.`);
  const byNota = failing.filter(r => !failedRequiredOf(cfg.learningResults.find(x => x.code === r.code)!.id).length);
  if (byNota.length) causes.push(`${byNota.map(r => r.code).join(", ")}: la nota no arriba al mínim exigit (${min}).`);
  let status: SummaryStatus;
  if (failing.length) status = "no-superat";
  else if (provisional) status = "pendent";
  else if (calc.globalScore >= min) status = "superat";
  else { status = "no-superat"; causes.push(`La nota projectada del mòdul no arriba al mínim exigit (${min}).`); }
  return {projected: calc.globalScore, coverage: calc.globalCoverage, provisional, status, causes, ras, requiredFailed};
}

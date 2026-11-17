import type {AcademicCourse, Activity, AssessmentCriterion, Enrollment, Grade, Group, LearningResult, RaAveraging} from "./domain.ts";

export const totalGrade = (grade: Grade | undefined): number | null => {
  if (!grade || grade.status === "pending") return null;
  if (grade.status === "not_presented") return 0;
  if (grade.baseValue === null) return null;
  return grade.baseValue + grade.bonuses.reduce((sum, bonus) => sum + bonus.value, 0);
};

export function activityIsEvaluated(group: Group, activityId: string): boolean {
  const state = group.activityStates.find(item => item.activityId === activityId);
  if (state?.manualOverride) return state.manualOverride === "evaluated";
  if (state?.automaticEvaluatedAt) return true;
  const completed = group.grades.filter(grade => grade.activityId === activityId && grade.status !== "pending" && totalGrade(grade) !== null).length;
  return completed >= 5;
}

/** Pes de cada activitat al mòdul en el mode de pesos explícits: Σ (pes de l'RA al mòdul × part de l'activitat dins l'RA). */
function explicitActivityWeights(course: AcademicCourse, onlyActive: boolean): Map<string, number> {
  const {activities, learningResults} = course.configuration;
  const raWeight = new Map(learningResults.filter(r => r.status === "active").map(r => [r.id, r.moduleWeight ?? 0]));
  const result = new Map<string, number>();
  for (const activity of activities.filter(a => a.session === "ordinaria" && (!onlyActive || a.status === "active")))
    result.set(activity.id, (activity.raShares ?? []).reduce((sum, s) => sum + (raWeight.get(s.raId) ?? 0) * s.share, 0));
  return result;
}

export function activityWeights(course: AcademicCourse): Map<string, number> {
  if (course.configuration.weightMode === "explicit") return explicitActivityWeights(course, true);
  const {activities, activityTypes} = course.configuration;
  const result = new Map<string, number>();
  for (const type of activityTypes.filter(item => item.status === "active")) {
    const members = activities.filter(activity => activity.status === "active" && activity.activityTypeId === type.id && activity.session === "ordinaria");
    for (const activity of members) result.set(activity.id, members.length ? type.weight / members.length : 0);
  }
  return result;
}

export function theoreticalActivityWeights(course: AcademicCourse): Map<string, number> {
  if (course.configuration.weightMode === "explicit") return explicitActivityWeights(course, false);
  const {activities, activityTypes} = course.configuration;
  const result = new Map<string, number>();
  for (const type of activityTypes.filter(item => item.status === "active")) {
    const members = activities.filter(activity => activity.activityTypeId === type.id && activity.session === "ordinaria");
    for (const activity of members) result.set(activity.id, members.length ? type.weight / members.length : 0);
  }
  return result;
}

function activeCriteria(course: AcademicCourse, ra?: LearningResult): AssessmentCriterion[] {
  return course.configuration.criteria.filter(c => c.status === "active" && (!ra || c.learningResultId === ra.id));
}

function criterionWeights(course: AcademicCourse, weights: Map<string, number>): Map<string, number> {
  const result = new Map<string, number>();
  for (const criterion of activeCriteria(course)) {
    const links = course.configuration.links.filter(link => link.criterionId === criterion.id);
    let total = 0;
    for (const link of links) total += link.allocation * (weights.get(link.activityId) ?? 0);
    result.set(criterion.id, total);
  }
  return result;
}

/**
 * Pes de cada activitat dins d'un RA (suma 100 % de les activitats vinculades): com compta dins la nota de l'RA, no sobre el mòdul.
 * Mitjana simple: cada criteri val igual i, dins d'un criteri, cada activitat pesa repartiment × pes de l'activitat.
 * Mitjana ponderada: cada criteri pesa segons el seu pes global.
 */
export function activityShareInRa(course: AcademicCourse, raId: string): Map<string, number> {
  const cfg = course.configuration, weights = activityWeights(course), out = new Map<string, number>();
  const ra = cfg.learningResults.find(r => r.id === raId);
  if (!ra) return out;
  const criteria = activeCriteria(course, ra);
  const raws = criteria.map(c => {
    const m = new Map<string, number>();
    for (const link of cfg.links.filter(l => l.criterionId === c.id)) m.set(link.activityId, (m.get(link.activityId) ?? 0) + link.allocation * (weights.get(link.activityId) ?? 0));
    return m;
  });
  const totals = raws.map(m => [...m.values()].reduce((sum, v) => sum + v, 0));
  if (cfg.raAveraging === "weighted") {
    const all = totals.reduce((sum, v) => sum + v, 0);
    if (all) for (const m of raws) for (const [id, v] of m) out.set(id, (out.get(id) ?? 0) + v / all);
  } else if (criteria.length) {
    raws.forEach((m, i) => { if (totals[i]) for (const [id, v] of m) out.set(id, (out.get(id) ?? 0) + v / totals[i] / criteria.length); });
  }
  return out;
}

export function raWeights(course: AcademicCourse, activityWeightsMap: Map<string, number> = activityWeights(course)): Map<string, number> {
  const criterionGlobalWeights = criterionWeights(course, activityWeightsMap);
  const result = new Map<string, number>();
  for (const ra of course.configuration.learningResults.filter(item => item.status === "active")) {
    const criteria = activeCriteria(course, ra);
    result.set(ra.id, criteria.reduce((sum, c) => sum + (criterionGlobalWeights.get(c.id) ?? 0), 0));
  }
  return result;
}

export function theoreticalRaWeights(course: AcademicCourse): Map<string, number> {
  return raWeights(course, theoreticalActivityWeights(course));
}

function raScore(policy: RaAveraging, assessedCriteria: AssessmentCriterion[], criterionScores: Map<string, number>, criterionGlobalWeights: Map<string, number>): number {
  if (!assessedCriteria.length) return 0;
  if (policy === "weighted") {
    const totalWeight = assessedCriteria.reduce((sum, c) => sum + (criterionGlobalWeights.get(c.id) ?? 0), 0);
    return totalWeight ? assessedCriteria.reduce((sum, c) => sum + (criterionScores.get(c.id) ?? 0) * (criterionGlobalWeights.get(c.id) ?? 0), 0) / totalWeight : 0;
  }
  return assessedCriteria.reduce((sum, c) => sum + (criterionScores.get(c.id) ?? 0), 0) / assessedCriteria.length;
}

export interface RequiredItem {id: string; name: string; /** Nota (un «No presentat» compta 0); null si encara no té nota. */ grade: number | null; status: "graded" | "not_presented" | "pending"}
export interface RequiredStatus {
  mode: "individual" | "average";
  items: RequiredItem[];
  /** Mitjana de les obligatòries amb nota (només en mode mitjana, quan totes en tenen). */
  average: number | null;
  /** Obligatòries que fan que el conjunt no se superi. */
  failedIds: string[];
  /** true: superades; false: no superades; null: encara no es pot dir (falten notes). */
  passed: boolean | null;
}

/**
 * Estat de les activitats obligatòries d'una UT per a un alumne. Per defecte cadascuna ha de tenir la nota mínima;
 * amb `requiredByAverage` es valora la mitjana de les obligatòries (un «No presentat» compta 0) un cop totes tenen nota.
 */
export function requiredGroupStatus(course: AcademicCourse, group: Group, enrollmentId: string, unit: {requiredActivityIds: string[]}): RequiredStatus {
  const min = course.configuration.requiredActivityMinGrade, mode = course.configuration.requiredByAverage ? "average" : "individual";
  const items: RequiredItem[] = unit.requiredActivityIds.map(id => course.configuration.activities.find(a => a.id === id)).filter((a): a is NonNullable<typeof a> => !!a && a.status === "active").map(a => {
    const grade = group.grades.find(g => g.enrollmentId === enrollmentId && g.activityId === a.id);
    if (grade?.status === "not_presented") return {id: a.id, name: a.name, grade: 0, status: "not_presented" as const};
    const total = grade?.status === "graded" ? totalGrade(grade) : null;
    return {id: a.id, name: a.name, grade: total, status: total === null ? "pending" as const : "graded" as const};
  });
  const pending = items.some(i => i.grade === null);
  if (mode === "individual") {
    const failedIds = items.filter(i => i.grade !== null && i.grade < min).map(i => i.id);
    return {mode, items, average: null, failedIds, passed: failedIds.length ? false : pending ? null : true};
  }
  if (pending || !items.length) return {mode, items, average: null, failedIds: [], passed: items.length ? null : true};
  const average = items.reduce((s, i) => s + (i.grade ?? 0), 0) / items.length;
  const passed = average >= min;
  return {mode, items, average, failedIds: passed ? [] : items.filter(i => (i.grade ?? 0) < min).map(i => i.id), passed};
}

export function failingRequiredActivities(course: AcademicCourse, group: Group, enrollmentId: string, learningResultId: string): number {
  const units = course.configuration.workUnits.filter(u => u.status === "active" && u.learningResultIds.includes(learningResultId));
  const failing = new Set<string>();
  for (const unit of units) for (const id of requiredGroupStatus(course, group, enrollmentId, unit).failedIds) failing.add(id);
  return failing.size;
}

export interface StudentCalculation {
  criteria: Map<string, number>;
  criteriaCoverage: Map<string, number>;
  /** `score`: nota estimada (projecció sobre el que ja està avaluat). `accumulated`: nota acumulada (mínim garantit, el que no té nota compta 0). */
  learningResults: Map<string, {score: number; coverage: number; failingActivities: number; provisional: boolean; accumulated: number}>;
  globalScore: number;
  globalCoverage: number;
  /** Nota global acumulada: punts ja guanyats sobre 10 (Σ nota acumulada de cada RA × el seu pes al mòdul). Tot el que no té nota compta 0; no és una projecció. */
  globalAccumulated: number;
}

export function calculateStudent(course: AcademicCourse, group: Group, enrollmentId: string): StudentCalculation {
  const weights = activityWeights(course);
  const evaluated = new Set(course.configuration.activities.filter(a => activityIsEvaluated(group, a.id)).map(a => a.id));
  const criterionScores = new Map<string, number>();
  const criterionCoverage = new Map<string, number>();
  const criterionGlobalWeights = criterionWeights(course, weights);
  const criterionEvaluatedWeights = new Map<string, number>();

  for (const criterion of activeCriteria(course)) {
    const links = course.configuration.links.filter(link => link.criterionId === criterion.id);
    const raw = new Map<string, number>();
    for (const link of links) raw.set(link.activityId, link.allocation * (weights.get(link.activityId) ?? 0));
    const rawTotal = [...raw.values()].reduce((sum, value) => sum + value, 0);
    const evaluatedTotal = [...raw].filter(([activityId]) => evaluated.has(activityId)).reduce((sum, [, value]) => sum + value, 0);
    criterionEvaluatedWeights.set(criterion.id, evaluatedTotal);
    criterionCoverage.set(criterion.id, rawTotal ? evaluatedTotal / rawTotal * 100 : 0);
    let score = 0;
    if (evaluatedTotal > 0) for (const [activityId, value] of raw) {
      if (!evaluated.has(activityId)) continue;
      const grade = group.grades.find(g => g.enrollmentId === enrollmentId && g.activityId === activityId);
      score += (totalGrade(grade) ?? 0) * value / evaluatedTotal;
    }
    criterionScores.set(criterion.id, score);
  }

  // Nota acumulada: cada activitat sense nota (o no presentada) compta 0 i cada CA, encara que no tingui cap evidència, compta a la mitjana de l'RA.
  // És un mínim garantit: només pot pujar a mesura que es corregeix. No és una projecció.
  const accumulatedCriteria = new Map<string, number>();
  for (const criterion of activeCriteria(course)) {
    let total = 0, earned = 0;
    for (const link of course.configuration.links.filter(l => l.criterionId === criterion.id)) {
      const weight = link.allocation * (weights.get(link.activityId) ?? 0);
      if (!weight) continue;
      total += weight;
      earned += weight * (totalGrade(group.grades.find(g => g.enrollmentId === enrollmentId && g.activityId === link.activityId)) ?? 0);
    }
    accumulatedCriteria.set(criterion.id, total ? earned / total : 0);
  }
  let accNumerator = 0;
  const raResults = new Map<string, {score: number; coverage: number; failingActivities: number; provisional: boolean; accumulated: number}>();
  const minCoverage = course.configuration.minRaCoverage ?? 25;
  let globalScore = 0; let globalCoverage = 0; let totalRaWeight = 0;
  for (const ra of course.configuration.learningResults.filter(item => item.status === "active")) {
    const criteria = activeCriteria(course, ra);
    const raWeight = criteria.reduce((sum, c) => sum + (criterionGlobalWeights.get(c.id) ?? 0), 0);
    const assessedCriteria = criteria.filter(c => (criterionEvaluatedWeights.get(c.id) ?? 0) > 0);
    const score = raScore(course.configuration.raAveraging, assessedCriteria, criterionScores, criterionGlobalWeights);
    const relatedActivityIds = new Set(course.configuration.links.filter(l => criteria.some(c => c.id === l.criterionId)).map(l => l.activityId));
    const possible = [...relatedActivityIds].reduce((sum, id) => sum + (weights.get(id) ?? 0), 0);
    const done = [...relatedActivityIds].filter(id => evaluated.has(id)).reduce((sum, id) => sum + (weights.get(id) ?? 0), 0);
    const coverage = possible ? Math.min(100, done / possible * 100) : 0;
    const failingActivities = failingRequiredActivities(course, group, enrollmentId, ra.id);
    // Provisional: hi ha evidència però és massa poca per valorar l'RA (tret que un examen obligatori ja estigui suspès).
    const accumulated = criteria.length === 0 ? 0 : course.configuration.raAveraging === "weighted"
      ? (raWeight ? criteria.reduce((sum, c) => sum + (accumulatedCriteria.get(c.id) ?? 0) * (criterionGlobalWeights.get(c.id) ?? 0), 0) / raWeight : 0)
      : criteria.reduce((sum, c) => sum + (accumulatedCriteria.get(c.id) ?? 0), 0) / criteria.length;
    accNumerator += accumulated * raWeight;
    raResults.set(ra.id, {score, coverage, failingActivities, provisional: coverage > 0 && coverage < minCoverage && failingActivities === 0, accumulated});
    const effectiveWeight = raWeight * coverage / 100;
    globalScore += score * effectiveWeight; totalRaWeight += effectiveWeight;
  }
  const allWeight = [...weights.values()].reduce((a, b) => a + b, 0);
  const evaluatedWeight = [...weights].filter(([id]) => evaluated.has(id)).reduce((sum, [, weight]) => sum + weight, 0);
  globalCoverage = allWeight ? evaluatedWeight / allWeight * 100 : 0;
  return {criteria: criterionScores, criteriaCoverage: criterionCoverage, learningResults: raResults, globalScore: totalRaWeight ? globalScore / totalRaWeight : 0, globalCoverage, globalAccumulated: accNumerator};
}

export function groupStdDev(course: AcademicCourse, group: Group): number {
  const scores = group.enrollments.filter(e => e.status === "active").map(e => calculateStudent(course, group, e.id).globalScore);
  if (scores.length < 2) return 0;
  const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  return Math.sqrt(scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length);
}

export function deliveryRate(course: AcademicCourse, group: Group): number {
  const activities = course.configuration.activities.filter(a => a.status === "active" && a.session === "ordinaria");
  const enrollments = group.enrollments.filter(e => e.status === "active");
  if (!activities.length || !enrollments.length) return 0;
  let delivered = 0;
  for (const activity of activities) for (const enrollment of enrollments) {
    const grade = group.grades.find(g => g.enrollmentId === enrollment.id && g.activityId === activity.id);
    if (isDelivered(grade)) delivered++;
  }
  return delivered / (activities.length * enrollments.length) * 100;
}

export function groupAsOfTerm(course: AcademicCourse, group: Group, maxTerm: number): Group {
  const allowed = new Set(course.configuration.activities.filter(a => a.term <= maxTerm).map(a => a.id));
  return {...group, grades: group.grades.filter(g => allowed.has(g.activityId)), activityStates: group.activityStates.filter(s => allowed.has(s.activityId))};
}

export interface ActivityInsight {
  activityId: string;
  average: number | null;
  gradedCount: number;
  failPct: number | null;
  notPresentedPct: number;
}

export function activityInsights(course: AcademicCourse, group: Group): ActivityInsight[] {
  const activities = course.configuration.activities.filter(a => a.status === "active" && a.session === "ordinaria");
  const enrollments = group.enrollments.filter(e => e.status === "active");
  return activities.map(activity => {
    const grades = enrollments.map(e => group.grades.find(g => g.enrollmentId === e.id && g.activityId === activity.id));
    const graded = grades.filter(g => g?.status === "graded" && totalGrade(g) !== null) as Grade[];
    const notPresented = grades.filter(g => g?.status === "not_presented").length;
    const average = graded.length ? graded.reduce((sum, g) => sum + totalGrade(g)!, 0) / graded.length : null;
    const failPct = graded.length ? graded.filter(g => totalGrade(g)! < 5).length / graded.length * 100 : null;
    return {activityId: activity.id, average, gradedCount: graded.length, failPct, notPresentedPct: enrollments.length ? notPresented / enrollments.length * 100 : 0};
  });
}

export const finalInteger = (value: number, threshold = .75) => Math.floor(value) + (value - Math.floor(value) >= threshold ? 1 : 0);

export function groupAverage(course: AcademicCourse, group: Group): number {
  const active = group.enrollments.filter(e => e.status === "active");
  if (!active.length) return 0;
  return active.reduce((sum, e) => sum + calculateStudent(course, group, e.id).globalScore, 0) / active.length;
}

export interface RaFinalResult {
  score: number;
  achieved: boolean;
  source: "ordinaria" | "extraordinaria";
}

interface RaEvidenceEntry {
  score: number;
  coverage: number;
  failingActivities: number;
  /** Evidència insuficient (per sota de la cobertura mínima): ni assolit ni no assolit. */
  provisional?: boolean;
}

/**
 * Un RA sense cap evidència avaluada encara (coverage 0%) no ha estat
 * ni assolit ni suspès: està pendent. Distingir-ho de "no assolit" és
 * necessari perquè `score` val 0 per defecte quan no hi ha evidència,
 * i confondre'l amb un RA realment suspès marcaria com a bloquejats
 * (o pendents de recuperar) alumnes que encara no han arribat a
 * aquell RA.
 */
export function raIsAchieved(entry?: RaEvidenceEntry): boolean {
  return !!entry && entry.coverage > 0 && !entry.provisional && entry.score >= 5 && entry.failingActivities === 0;
}
export function raIsFailing(entry?: RaEvidenceEntry): boolean {
  return !!entry && entry.coverage > 0 && !entry.provisional && !(entry.score >= 5 && entry.failingActivities === 0);
}
export const raIsProvisional = (entry?: RaEvidenceEntry): boolean => !!entry && entry.coverage > 0 && !!entry.provisional;

/** Lliurat = hi ha nota o «no presentat» no compta: un no presentat no s'ha lliurat. */
/** Lliurada: amb nota i sense ser «No presentat». Una nota de 0 vol dir que no s'ha lliurat (en blanc o fora de termini). */
export const isDelivered = (grade?: Pick<Grade, "status"> & Partial<Pick<Grade, "baseValue" | "bonuses">>): boolean => {
  if (!grade || grade.status !== "graded") return false;
  if (typeof grade.baseValue !== "number") return true;
  return totalGrade(grade as Grade) !== 0;
};

export interface StudentFinalCalculation {
  ordinaria: StudentCalculation;
  learningResults: Map<string, RaFinalResult>;
  globalScore: number;
  modulePassed: boolean;
}

/**
 * Resolució final d'un alumne un cop es té en compte la convocatòria
 * extraordinària: cada RA no assolit a l'ordinària es recalcula amb la
 * seva activitat de recuperació (`recoversRaIds`), si n'hi ha i té nota.
 * La nota de recuperació substitueix la de l'ordinària tal qual (sense
 * capar-la ni comprovar activitats obligatòries). La ponderació global
 * és sempre la de l'ordinària (`raWeights`): l'extraordinària no hi
 * afegeix ni en treu pes.
 */
export function calculateFinalStudent(course: AcademicCourse, group: Group, enrollmentId: string): StudentFinalCalculation {
  const ordinaria = calculateStudent(course, group, enrollmentId);
  const weights = raWeights(course);
  const activities = course.configuration.activities;
  const ras = course.configuration.learningResults.filter(r => r.status === "active");
  const learningResults = new Map<string, RaFinalResult>();
  let globalScore = 0; let totalWeight = 0;
  for (const ra of ras) {
    const ordinariaEntry = ordinaria.learningResults.get(ra.id);
    let result: RaFinalResult;
    if (raIsAchieved(ordinariaEntry)) {
      result = {score: ordinariaEntry!.score, achieved: true, source: "ordinaria"};
    } else if (!raIsFailing(ordinariaEntry)) {
      // Pendent: encara no hi ha evidència d'aquest RA (no és que estigui suspès). No té sentit buscar-hi recuperació.
      result = {score: ordinariaEntry?.score ?? 0, achieved: false, source: "ordinaria"};
    } else {
      const recoveryActivity = activities.find(a => a.status === "active" && a.session === "extraordinaria" && a.recoversRaIds.includes(ra.id));
      const recoveryGrade = recoveryActivity ? group.grades.find(g => g.enrollmentId === enrollmentId && g.activityId === recoveryActivity.id) : undefined;
      const recoveryScore = recoveryGrade ? totalGrade(recoveryGrade) : null;
      result = recoveryScore !== null
        ? {score: recoveryScore, achieved: recoveryScore >= 5, source: "extraordinaria"}
        : {score: ordinariaEntry?.score ?? 0, achieved: false, source: "ordinaria"};
    }
    learningResults.set(ra.id, result);
    const weight = weights.get(ra.id) ?? 0;
    globalScore += result.score * weight;
    totalWeight += weight;
  }
  const modulePassed = ras.length > 0 && [...learningResults.values()].every(r => r.achieved);
  return {ordinaria, learningResults, globalScore: totalWeight ? globalScore / totalWeight : 0, modulePassed};
}

/** Convocatòries consumides: el baseline heretat + l'ordinària d'enguany
 * (sempre es consumeix) + l'extraordinària, només si l'alumne s'hi presenta. */
export function convocatoriaConsumida(enrollment: Enrollment): number {
  return enrollment.convocatoria.baseline + 1 + (enrollment.convocatoria.extraordinariaPresented === true ? 1 : 0);
}

export function convocatoriaExhaurida(enrollment: Enrollment): boolean {
  return convocatoriaConsumida(enrollment) >= 4;
}

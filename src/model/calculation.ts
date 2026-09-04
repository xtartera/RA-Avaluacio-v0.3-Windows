import type {AcademicCourse, Activity, AssessmentCriterion, Grade, Group, LearningResult, RaAveraging} from "./domain.ts";

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

export function activityWeights(course: AcademicCourse): Map<string, number> {
  const {activities, activityTypes} = course.configuration;
  const result = new Map<string, number>();
  for (const type of activityTypes.filter(item => item.status === "active")) {
    const members = activities.filter(activity => activity.status === "active" && activity.activityTypeId === type.id);
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

export function raWeights(course: AcademicCourse): Map<string, number> {
  const criterionGlobalWeights = criterionWeights(course, activityWeights(course));
  const result = new Map<string, number>();
  for (const ra of course.configuration.learningResults.filter(item => item.status === "active")) {
    const criteria = activeCriteria(course, ra);
    result.set(ra.id, criteria.reduce((sum, c) => sum + (criterionGlobalWeights.get(c.id) ?? 0), 0));
  }
  return result;
}

function raScore(policy: RaAveraging, assessedCriteria: AssessmentCriterion[], criterionScores: Map<string, number>, criterionGlobalWeights: Map<string, number>): number {
  if (!assessedCriteria.length) return 0;
  if (policy === "weighted") {
    const totalWeight = assessedCriteria.reduce((sum, c) => sum + (criterionGlobalWeights.get(c.id) ?? 0), 0);
    return totalWeight ? assessedCriteria.reduce((sum, c) => sum + (criterionScores.get(c.id) ?? 0) * (criterionGlobalWeights.get(c.id) ?? 0), 0) / totalWeight : 0;
  }
  return assessedCriteria.reduce((sum, c) => sum + (criterionScores.get(c.id) ?? 0), 0) / assessedCriteria.length;
}

export function failingRequiredActivities(course: AcademicCourse, group: Group, enrollmentId: string, learningResultId: string): number {
  const units = course.configuration.workUnits.filter(u => u.status === "active" && u.learningResultIds.includes(learningResultId));
  const failing = new Set<string>();
  for (const unit of units) for (const activityId of unit.requiredActivityIds) {
    const grade = group.grades.find(g => g.enrollmentId === enrollmentId && g.activityId === activityId);
    const total = totalGrade(grade);
    if (total !== null && total < 5) failing.add(activityId);
  }
  return failing.size;
}

export interface StudentCalculation {
  criteria: Map<string, number>;
  learningResults: Map<string, {score: number; coverage: number; failingActivities: number}>;
  globalScore: number;
  globalCoverage: number;
}

export function calculateStudent(course: AcademicCourse, group: Group, enrollmentId: string): StudentCalculation {
  const weights = activityWeights(course);
  const evaluated = new Set(course.configuration.activities.filter(a => activityIsEvaluated(group, a.id)).map(a => a.id));
  const criterionScores = new Map<string, number>();
  const criterionGlobalWeights = criterionWeights(course, weights);
  const criterionEvaluatedWeights = new Map<string, number>();

  for (const criterion of activeCriteria(course)) {
    const links = course.configuration.links.filter(link => link.criterionId === criterion.id);
    const raw = new Map<string, number>();
    for (const link of links) raw.set(link.activityId, link.allocation * (weights.get(link.activityId) ?? 0));
    const evaluatedTotal = [...raw].filter(([activityId]) => evaluated.has(activityId)).reduce((sum, [, value]) => sum + value, 0);
    criterionEvaluatedWeights.set(criterion.id, evaluatedTotal);
    let score = 0;
    if (evaluatedTotal > 0) for (const [activityId, value] of raw) {
      if (!evaluated.has(activityId)) continue;
      const grade = group.grades.find(g => g.enrollmentId === enrollmentId && g.activityId === activityId);
      score += (totalGrade(grade) ?? 0) * value / evaluatedTotal;
    }
    criterionScores.set(criterion.id, score);
  }

  const raResults = new Map<string, {score: number; coverage: number; failingActivities: number}>();
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
    raResults.set(ra.id, {score, coverage, failingActivities: failingRequiredActivities(course, group, enrollmentId, ra.id)});
    const effectiveWeight = raWeight * coverage / 100;
    globalScore += score * effectiveWeight; totalRaWeight += effectiveWeight;
  }
  const allWeight = [...weights.values()].reduce((a, b) => a + b, 0);
  const evaluatedWeight = [...weights].filter(([id]) => evaluated.has(id)).reduce((sum, [, weight]) => sum + weight, 0);
  globalCoverage = allWeight ? evaluatedWeight / allWeight * 100 : 0;
  return {criteria: criterionScores, learningResults: raResults, globalScore: totalRaWeight ? globalScore / totalRaWeight : 0, globalCoverage};
}

export const finalInteger = (value: number, threshold = .75) => Math.floor(value) + (value - Math.floor(value) >= threshold ? 1 : 0);

export function groupAverage(course: AcademicCourse, group: Group): number {
  const active = group.enrollments.filter(e => e.status === "active");
  if (!active.length) return 0;
  return active.reduce((sum, e) => sum + calculateStudent(course, group, e.id).globalScore, 0) / active.length;
}

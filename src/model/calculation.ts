import type {AcademicCourse, Activity, AssessmentCriterion, Grade, Group, LearningResult} from "./domain.ts";

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

export interface StudentCalculation {
  criteria: Map<string, number>;
  learningResults: Map<string, {score: number; coverage: number}>;
  globalScore: number;
  globalCoverage: number;
}

export function calculateStudent(course: AcademicCourse, group: Group, enrollmentId: string): StudentCalculation {
  const weights = activityWeights(course);
  const evaluated = new Set(course.configuration.activities.filter(a => activityIsEvaluated(group, a.id)).map(a => a.id));
  const criterionScores = new Map<string, number>();
  const criterionGlobalWeights = new Map<string, number>();
  const criterionEvaluatedWeights = new Map<string, number>();
  const contribution = new Map<string, Map<string, number>>();

  for (const criterion of activeCriteria(course)) {
    const links = course.configuration.links.filter(link => link.criterionId === criterion.id);
    const raw = new Map<string, number>();
    let total = 0;
    for (const link of links) {
      const value = link.allocation * (weights.get(link.activityId) ?? 0);
      raw.set(link.activityId, value); total += value;
    }
    criterionGlobalWeights.set(criterion.id, total);
    contribution.set(criterion.id, raw);
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

  const raResults = new Map<string, {score: number; coverage: number}>();
  let globalScore = 0; let globalCoverage = 0; let totalRaWeight = 0;
  for (const ra of course.configuration.learningResults.filter(item => item.status === "active")) {
    const criteria = activeCriteria(course, ra);
    const raWeight = criteria.reduce((sum, c) => sum + (criterionGlobalWeights.get(c.id) ?? 0), 0);
    const assessedCriteria = criteria.filter(c => (criterionEvaluatedWeights.get(c.id) ?? 0) > 0);
    const score = assessedCriteria.length ? assessedCriteria.reduce((sum, c) => sum + (criterionScores.get(c.id) ?? 0), 0) / assessedCriteria.length : 0;
    const relatedActivityIds = new Set(course.configuration.links.filter(l => criteria.some(c => c.id === l.criterionId)).map(l => l.activityId));
    const possible = [...relatedActivityIds].reduce((sum, id) => sum + (weights.get(id) ?? 0), 0);
    const done = [...relatedActivityIds].filter(id => evaluated.has(id)).reduce((sum, id) => sum + (weights.get(id) ?? 0), 0);
    const coverage = possible ? Math.min(100, done / possible * 100) : 0;
    raResults.set(ra.id, {score, coverage});
    const effectiveWeight = raWeight * coverage / 100;
    globalScore += score * effectiveWeight; totalRaWeight += effectiveWeight;
  }
  const allWeight = [...weights.values()].reduce((a, b) => a + b, 0);
  const evaluatedWeight = [...weights].filter(([id]) => evaluated.has(id)).reduce((sum, [, weight]) => sum + weight, 0);
  globalCoverage = allWeight ? evaluatedWeight / allWeight * 100 : 0;
  return {criteria: criterionScores, learningResults: raResults, globalScore: totalRaWeight ? globalScore / totalRaWeight : 0, globalCoverage};
}

export const finalInteger = (value: number) => Math.floor(value) + (value - Math.floor(value) >= .75 ? 1 : 0);

export function groupAverage(course: AcademicCourse, group: Group): number {
  const active = group.enrollments.filter(e => e.status === "active");
  if (!active.length) return 0;
  return active.reduce((sum, e) => sum + calculateStudent(course, group, e.id).globalScore, 0) / active.length;
}

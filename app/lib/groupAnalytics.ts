import type {ElementType} from "react";
import {AlertCircle, AlertTriangle, Info, Sparkles, ThumbsUp, TrendingDown, TrendingUp} from "lucide-react";
import {activityInsights, calculateFinalStudent, calculateStudent, convocatoriaExhaurida, deliveryRate, groupAsOfTerm, groupStdDev, raIsFailing, type StudentCalculation} from "../../src/model/calculation";
import type {AcademicCourse, Enrollment, Group, LearningResult} from "../../src/model/domain";
import {computeBands, termOrdinal} from "./helpers";
import type {ActivityRow, Tone} from "../components/analysis";

export interface GroupSummary {
 count: number;
 scores: number[];
 calc: StudentCalculation[];
 average: number;
 coverage: number;
 stdDev: number;
 delivery: number;
 withEvidenceCount: number;
 noEvidenceCount: number;
 passed: number; passedPct: number; passedNames: string[];
 risk: number; riskPct: number; riskNames: string[];
 borderline: number; borderlinePct: number; borderlineNames: string[];
 excellence: number; excellencePct: number; excellenceNames: string[];
}

export function summarizeGroup(course: AcademicCourse, group: Group): GroupSummary {
 const active = group.enrollments.filter(e => e.status === "active");
 const calc = active.map(e => calculateStudent(course, group, e.id));
 const scores = calc.map(c => c.globalScore);
 const count = active.length;

 const ras = course.configuration.learningResults.filter(r => r.status === "active");
 const perStudent = active.map((enrollment, i) => {
  const c = calc[i];
  const name = group.students.find(s => s.id === enrollment.studentId)?.name ?? "—";
  let evaluated = 0, failed = 0;
  for (const ra of ras) {
   const entry = c.learningResults.get(ra.id);
   if (!entry || entry.coverage <= 0) continue;
   evaluated++;
   if (!(entry.score >= 5 && entry.failingActivities === 0)) failed++;
  }
  return {name, evaluated, failed, score: c.globalScore};
 });
 const byName = (a: {name: string}, b: {name: string}) => a.name.localeCompare(b.name, "ca");
 const withEvidence = perStudent.filter(x => x.evaluated > 0);
 const withEvidenceCount = withEvidence.length;
 const noEvidenceCount = count - withEvidenceCount;
 const pct = (n: number) => withEvidenceCount ? n / withEvidenceCount * 100 : 0;

 const passedNames = withEvidence.filter(x => x.failed === 0).sort(byName).map(x => x.name);
 const borderlineNames = withEvidence.filter(x => x.failed === 1).sort(byName).map(x => x.name);
 const riskNames = withEvidence.filter(x => x.failed >= 2).sort(byName).map(x => x.name);
 const excellenceNames = withEvidence.filter(x => x.failed === 0 && x.score >= 8).sort(byName).map(x => x.name);

 return {
  count, scores, calc,
  average: count ? scores.reduce((a, b) => a + b, 0) / count : 0,
  coverage: calc[0]?.globalCoverage ?? 0,
  stdDev: groupStdDev(course, group),
  delivery: deliveryRate(course, group),
  withEvidenceCount, noEvidenceCount,
  passed: passedNames.length, passedPct: pct(passedNames.length), passedNames,
  risk: riskNames.length, riskPct: pct(riskNames.length), riskNames,
  borderline: borderlineNames.length, borderlinePct: pct(borderlineNames.length), borderlineNames,
  excellence: excellenceNames.length, excellencePct: pct(excellenceNames.length), excellenceNames,
 };
}

export interface RaRecoveryGroupRow {
 ra: LearningResult;
 needingCount: number;
 recoveredCount: number;
 pendingCount: number;
 average: number | null;
}

export interface RaFinalGroupRow {
 ra: LearningResult;
 average: number | null;
 achievementPct: number | null;
 passed: number;
 failed: number;
 total: number;
}

export interface GroupConvocatoriaSummary {
 blockedOrdinariaCount: number;
 passedFinalCount: number;
 passedFinalPct: number;
 recoveredNames: string[];
 stillBlockedNames: string[];
 exhaustedNames: string[];
 repeaterCount: number;
 finalAverage: number;
 raRowsExtra: RaRecoveryGroupRow[];
 raRowsFinal: RaFinalGroupRow[];
}

export function summarizeConvocatoria(course: AcademicCourse, group: Group): GroupConvocatoriaSummary {
 const active = group.enrollments.filter(e => e.status === "active");
 const ras = course.configuration.learningResults.filter(r => r.status === "active");
 const byName = (a: {name: string}, b: {name: string}) => a.name.localeCompare(b.name, "ca");
 const rows = active.map(enrollment => {
  const name = group.students.find(s => s.id === enrollment.studentId)?.name ?? "—";
  const final = calculateFinalStudent(course, group, enrollment.id);
  const blockedRaIds = new Set(ras.filter(ra => raIsFailing(final.ordinaria.learningResults.get(ra.id))).map(ra => ra.id));
  return {name, blockedRaIds, final};
 });
 const blocked = rows.filter(r => r.blockedRaIds.size > 0);
 const recoveredNames = blocked.filter(r => r.final.modulePassed).sort(byName).map(r => r.name);
 const stillBlockedNames = blocked.filter(r => !r.final.modulePassed).sort(byName).map(r => r.name);
 const exhaustedNames = active.filter(e => convocatoriaExhaurida(e)).map(e => group.students.find(s => s.id === e.studentId)?.name ?? "—").sort((a, b) => a.localeCompare(b, "ca"));
 const passedFinalCount = active.length - stillBlockedNames.length;
 const finalAverage = active.length ? rows.reduce((sum, r) => sum + r.final.globalScore, 0) / active.length : 0;

 const raRowsExtra: RaRecoveryGroupRow[] = ras.map(ra => {
  const needing = rows.filter(r => r.blockedRaIds.has(ra.id));
  const gradedRecoveries = needing.filter(r => r.final.learningResults.get(ra.id)!.source === "extraordinaria");
  return {
   ra, needingCount: needing.length, recoveredCount: gradedRecoveries.filter(r => r.final.learningResults.get(ra.id)!.achieved).length,
   pendingCount: needing.length - gradedRecoveries.length,
   average: gradedRecoveries.length ? gradedRecoveries.reduce((sum, r) => sum + r.final.learningResults.get(ra.id)!.score, 0) / gradedRecoveries.length : null,
  };
 }).filter(r => r.needingCount > 0);

 const raRowsFinal: RaFinalGroupRow[] = ras.map(ra => {
  const total = rows.length;
  const scores = rows.map(r => r.final.learningResults.get(ra.id)!.score);
  const passed = rows.filter(r => r.final.learningResults.get(ra.id)!.achieved).length;
  return {ra, average: total ? scores.reduce((a, b) => a + b, 0) / total : null, achievementPct: total ? passed / total * 100 : null, passed, failed: total - passed, total};
 });

 return {
  blockedOrdinariaCount: blocked.length,
  passedFinalCount, passedFinalPct: active.length ? passedFinalCount / active.length * 100 : 0,
  recoveredNames, stillBlockedNames, exhaustedNames,
  repeaterCount: active.filter(e => e.convocatoria.isRepeater).length,
  finalAverage, raRowsExtra, raRowsFinal,
 };
}

export interface RaGroupRow {
 ra: LearningResult;
 average: number | null;
 achievementPct: number | null;
 coverage: number;
 passed: number;
 failed: number;
 total: number;
}

export interface GroupAnalytics {
 own: GroupSummary;
 otherGroup: Group | null;
 other: GroupSummary | null;
 bands: {label: string; range: string; cls: string; count: number}[];
 withdrawnEnrollments: Enrollment[];
 withdrawnNames: string[];
 totalEnrolled: number;
 withdrawnPct: number;
 archivedEnrollments: Enrollment[];
 archivedNames: string[];
 archivedPct: number;
 t1: GroupSummary;
 hasEvolution: boolean;
 trendDelta: number;
 improved: number;
 worsened: number;
 stable: number;
 trendPoints: {label: string; value: number}[];
 raRows: RaGroupRow[];
 insights: ActivityRow[];
 bySuccess: ActivityRow[];
 byDifficulty: ActivityRow[];
 byMissing: ActivityRow[];
 weakestRa: RaGroupRow | undefined;
 worstDelivery: ActivityRow | undefined;
 diagnosis: {tone: Tone; icon: ElementType; text: string}[];
 actions: string[];
 coverageGapWarning: boolean;
 convocatoria: GroupConvocatoriaSummary;
}

export function analyzeGroup(course: AcademicCourse, group: Group, compareGroupId?: string): GroupAnalytics {
 const otherGroup = (compareGroupId ? course.groups.find(g => g.id === compareGroupId) : course.groups.find(g => g.id !== group.id)) ?? null;
 const own = summarizeGroup(course, group);
 const other = otherGroup ? summarizeGroup(course, otherGroup) : null;
 const bands = computeBands(own.scores);

 const withdrawnEnrollments = group.enrollments.filter(e => e.status === "withdrawn");
 const withdrawnNames = withdrawnEnrollments.map(e => group.students.find(s => s.id === e.studentId)?.name ?? "—").sort((a, b) => a.localeCompare(b, "ca"));
 const totalEnrolled = group.enrollments.length;
 const withdrawnPct = totalEnrolled ? withdrawnEnrollments.length / totalEnrolled * 100 : 0;

 const archivedEnrollments = group.enrollments.filter(e => e.status === "archived");
 const archivedNames = archivedEnrollments.map(e => group.students.find(s => s.id === e.studentId)?.name ?? "—").sort((a, b) => a.localeCompare(b, "ca"));
 const archivedPct = totalEnrolled ? archivedEnrollments.length / totalEnrolled * 100 : 0;

 const termCount = course.configuration.termCount || 2;
 const termCheckpoints = Array.from({length: Math.max(0, termCount - 1)}, (_, i) => i + 1)
  .map(term => ({term, summary: summarizeGroup(course, groupAsOfTerm(course, group, term))}));
 const t1 = termCheckpoints[0]?.summary ?? own;
 const hasEvolution = own.count > 0 && termCheckpoints.length > 0;
 const trendDelta = hasEvolution ? own.average - t1.average : 0;
 const EPS = .1;
 const evoDeltas = hasEvolution ? own.scores.map((s, i) => s - (t1.scores[i] ?? 0)) : [];
 const improved = evoDeltas.filter(d => d > EPS).length;
 const worsened = evoDeltas.filter(d => d < -EPS).length;
 const stable = hasEvolution ? own.count - improved - worsened : 0;
 const trendPoints = [
  {label: "Inici", value: 0},
  ...termCheckpoints.map(c => ({label: `${termOrdinal(c.term)} trimestre`, value: c.summary.average})),
  {label: "Actual", value: own.average},
 ];

 const ras = course.configuration.learningResults.filter(r => r.status === "active");
 const raRows: RaGroupRow[] = ras.map(ra => {
  const scores = own.calc.map(c => c.learningResults.get(ra.id)?.score ?? 0);
  const failing = own.calc.map(c => c.learningResults.get(ra.id)?.failingActivities ?? 0);
  const coverage = own.calc[0]?.learningResults.get(ra.id)?.coverage ?? 0;
  const hasEvidence = coverage > 0 && own.count > 0;
  const average = hasEvidence ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const total = hasEvidence ? scores.length : 0;
  const passed = hasEvidence ? scores.filter((s, i) => s >= 5 && failing[i] === 0).length : 0;
  const achievementPct = hasEvidence ? passed / total * 100 : null;
  return {ra, average, achievementPct, coverage, passed, failed: total - passed, total};
 });

 const activities = course.configuration.activities.filter(a => a.status === "active");
 const insights = activityInsights(course, group)
  .map(x => ({...x, activity: activities.find(a => a.id === x.activityId)}))
  .filter((x): x is typeof x & {activity: NonNullable<typeof x.activity>} => !!x.activity);
 const bySuccess = [...insights].filter(x => x.average !== null).sort((a, b) => b.average! - a.average!);
 const byDifficulty = [...insights].filter(x => x.average !== null).sort((a, b) => a.average! - b.average!);
 const byMissing = [...insights].filter(x => x.notPresentedPct > 0).sort((a, b) => b.notPresentedPct - a.notPresentedPct);

 const weakestRa = [...raRows].filter(r => r.achievementPct !== null).sort((a, b) => a.achievementPct! - b.achievementPct!)[0];
 const worstDelivery = [...insights].filter(x => x.notPresentedPct > 15).sort((a, b) => b.notPresentedPct - a.notPresentedPct)[0];

 const diagnosis: GroupAnalytics["diagnosis"] = [];
 diagnosis.push({tone: "blue", icon: Info, text: `La cobertura avaluada és del ${own.coverage.toFixed(0)}%; les dades ${own.coverage < 100 ? "encara són provisionals" : "són completes"}.`});
 if (own.count === 0) diagnosis.push({tone: "blue", icon: Info, text: "Encara no hi ha alumnat actiu matriculat en aquest grup."});
 else {
  if (own.riskPct > 15) diagnosis.push({tone: "red", icon: AlertTriangle, text: `El ${own.riskPct.toFixed(0)}% de l'alumnat té 2 o més RA no assolits; cal seguiment prioritari.`});
  else if (own.riskPct > 0) diagnosis.push({tone: "amber", icon: AlertTriangle, text: `Un ${own.riskPct.toFixed(0)}% de l'alumnat té 2 o més RA no assolits.`});
  else diagnosis.push({tone: "green", icon: ThumbsUp, text: "Cap alumne amb 2 o més RA no assolits amb les dades actuals."});
  if (Math.abs(trendDelta) >= .1) diagnosis.push({tone: trendDelta > 0 ? "green" : "red", icon: trendDelta > 0 ? TrendingUp : TrendingDown, text: `El grup mostra una evolució ${trendDelta > 0 ? "positiva" : "negativa"} (${trendDelta > 0 ? "+" : ""}${trendDelta.toFixed(2)}) respecte al 1r trimestre.`});
  if (weakestRa) diagnosis.push({tone: weakestRa.achievementPct! < 60 ? "red" : "amber", icon: AlertCircle, text: `${weakestRa.ra.code} és el resultat amb menor assoliment (${weakestRa.achievementPct!.toFixed(0)}%).`});
  if (own.delivery < 80) diagnosis.push({tone: "amber", icon: AlertTriangle, text: `La taxa de lliurament és del ${own.delivery.toFixed(0)}%; encara hi ha lliuraments pendents.`});
  if (own.excellencePct >= 20) diagnosis.push({tone: "green", icon: Sparkles, text: `Un ${own.excellencePct.toFixed(0)}% de l'alumnat assoleix nivell d'excel·lència (≥8).`});
 }

 const actions: string[] = [];
 if (weakestRa && weakestRa.achievementPct! < 70) actions.push(`Revisar la programació d'activitats vinculades a ${weakestRa.ra.code}: és el RA amb el % d'assoliment més baix del grup (${weakestRa.achievementPct!.toFixed(0)}%).`);
 if (own.risk > 0) actions.push(`Fer seguiment específic de l'alumnat en risc (${own.risk} alumnes).`);
 if (worstDelivery) actions.push(`Investigar els no lliuraments a «${worstDelivery.activity.name}» (${worstDelivery.notPresentedPct.toFixed(0)}%).`);
 if (own.coverage < 50) actions.push(`Continuar recollint evidències: la cobertura avaluada encara és del ${own.coverage.toFixed(0)}%.`);
 if (!actions.length) actions.push("Cap actuació prioritària detectada amb les dades actuals.");

 const coverageGapWarning = !!(other && Math.abs(own.coverage - other.coverage) > 15);
 const convocatoria = summarizeConvocatoria(course, group);

 return {own, otherGroup, other, bands, withdrawnEnrollments, withdrawnNames, totalEnrolled, withdrawnPct, archivedEnrollments, archivedNames, archivedPct, t1, hasEvolution, trendDelta, improved, worsened, stable, trendPoints, raRows, insights, bySuccess, byDifficulty, byMissing, weakestRa, worstDelivery, diagnosis, actions, coverageGapWarning, convocatoria};
}

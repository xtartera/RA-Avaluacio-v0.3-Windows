import type {ElementType} from "react";
import {AlertTriangle, Info, ThumbsUp, TrendingDown, TrendingUp} from "lucide-react";
import {calculateStudent, groupAsOfTerm, totalGrade, type StudentCalculation} from "../../src/model/calculation";
import type {AcademicCourse, ActivityType, Grade, Group, LearningResult} from "../../src/model/domain";
import type {Tone} from "../components/analysis";

export interface RaAnalysisRow {
 ra: LearningResult;
 score: number | null;
 groupAvg: number | null;
 coverage: number;
 status: "assolit" | "risc" | "pendent";
 failing: number;
 trend: "up" | "down" | "flat" | null;
}

export interface ActivityTypeRow {
 type: ActivityType;
 average: number | null;
 available: number;
}

export interface StudentAnalytics {
 calc: StudentCalculation;
 calcT1: StudentCalculation;
 hasStudentEvidence: boolean;
 trendDelta: number;
 groupAverage: number;
 groupT1Average: number;
 raRows: RaAnalysisRow[];
 withEvidence: RaAnalysisRow[];
 achievedCount: number;
 riskRas: RaAnalysisRow[];
 activitiesTotal: number;
 delivered: number;
 deliveryPct: number;
 typeRows: ActivityTypeRow[];
 diagnosis: {tone: Tone; icon: ElementType; text: string}[];
 strengths: string[];
 improve: string[];
 actions: string[];
}

export function analyzeStudent(course: AcademicCourse, group: Group, enrollmentId: string): StudentAnalytics {
 const calc = calculateStudent(course, group, enrollmentId);
 const t1Group = groupAsOfTerm(course, group, 1);
 const calcT1 = calculateStudent(course, t1Group, enrollmentId);
 const activeAll = group.enrollments.filter(e => e.status === "active");
 const groupCalc = activeAll.map(e => calculateStudent(course, group, e.id));
 const groupT1Calc = activeAll.map(e => calculateStudent(course, t1Group, e.id));
 const groupAverage = groupCalc.length ? groupCalc.reduce((s, c) => s + c.globalScore, 0) / groupCalc.length : 0;
 const groupT1Average = groupT1Calc.length ? groupT1Calc.reduce((s, c) => s + c.globalScore, 0) / groupT1Calc.length : 0;

 const hasStudentEvidence = group.grades.some(g => g.enrollmentId === enrollmentId && g.status !== "pending");
 const trendDelta = hasStudentEvidence ? calc.globalScore - calcT1.globalScore : 0;

 const ras = course.configuration.learningResults.filter(r => r.status === "active");
 const raRows: RaAnalysisRow[] = ras.map(ra => {
  const entry = calc.learningResults.get(ra.id);
  const coverage = entry?.coverage ?? 0;
  const hasEvidence = coverage > 0;
  const score = hasEvidence ? (entry?.score ?? 0) : null;
  const failing = entry?.failingActivities ?? 0;
  const groupScores = groupCalc.map(c => c.learningResults.get(ra.id)?.score ?? 0);
  const groupAvg = hasEvidence && groupScores.length ? groupScores.reduce((a, b) => a + b, 0) / groupScores.length : null;
  const t1Entry = calcT1.learningResults.get(ra.id);
  const t1Score = t1Entry && t1Entry.coverage > 0 ? t1Entry.score : null;
  const trend: RaAnalysisRow["trend"] = hasEvidence && t1Score !== null ? (score! - t1Score > .1 ? "up" : score! - t1Score < -.1 ? "down" : "flat") : null;
  const status: RaAnalysisRow["status"] = !hasEvidence ? "pendent" : score! >= 5 && failing === 0 ? "assolit" : "risc";
  return {ra, score, groupAvg, coverage, status, failing, trend};
 });
 const withEvidence = raRows.filter(r => r.status !== "pendent");
 const achievedCount = withEvidence.filter(r => r.status === "assolit").length;
 const riskRas = withEvidence.filter(r => r.status === "risc");

 const activitiesAll = course.configuration.activities.filter(a => a.status === "active");
 const delivered = activitiesAll.filter(a => {const g = group.grades.find(x => x.enrollmentId === enrollmentId && x.activityId === a.id); return g && g.status !== "pending"}).length;
 const deliveryPct = activitiesAll.length ? delivered / activitiesAll.length * 100 : 0;

 const typeRows: ActivityTypeRow[] = course.configuration.activityTypes.filter(t => t.status === "active").map(type => {
  const acts = activitiesAll.filter(a => a.activityTypeId === type.id);
  const grades = acts.map(a => group.grades.find(g => g.enrollmentId === enrollmentId && g.activityId === a.id)).filter(g => g?.status === "graded" && totalGrade(g) !== null) as Grade[];
  const average = grades.length ? grades.reduce((s, g) => s + totalGrade(g)!, 0) / grades.length : null;
  return {type, average, available: acts.length};
 }).filter(t => t.available > 0).sort((a, b) => (b.average ?? -1) - (a.average ?? -1));

 const diagnosis: StudentAnalytics["diagnosis"] = [];
 const strengths: string[] = [];
 const improve: string[] = [];
 const actions: string[] = [];

 if (!hasStudentEvidence) {
  diagnosis.push({tone: "blue", icon: Info, text: "Encara no hi ha evidències suficients per a aquest alumne."});
 } else {
  diagnosis.push({tone: "blue", icon: Info, text: `La cobertura avaluada és del ${calc.globalCoverage.toFixed(0)}%; les dades ${calc.globalCoverage < 100 ? "encara són provisionals" : "són completes"}.`});
  if (Math.abs(trendDelta) >= .1) diagnosis.push({tone: trendDelta > 0 ? "green" : "red", icon: trendDelta > 0 ? TrendingUp : TrendingDown, text: `La nota projectada ha ${trendDelta > 0 ? "augmentat" : "disminuït"} ${trendDelta > 0 ? "+" : ""}${trendDelta.toFixed(2)} punts respecte al 1r trimestre.`});
  const belowFive = riskRas.filter(r => r.score! < 5);
  const blockedPositive = riskRas.filter(r => r.score! >= 5);
  if (belowFive.length) diagnosis.push({tone: belowFive.length > 1 ? "red" : "amber", icon: AlertTriangle, text: `${belowFive.map(r => r.ra.code).join(", ")}: nota provisional per sota de 5.`});
  if (blockedPositive.length) diagnosis.push({tone: "amber", icon: AlertTriangle, text: `${blockedPositive.map(r => r.ra.code).join(", ")}: nota positiva però no assolit, per activitat obligatòria suspesa.`});
  if (!riskRas.length && withEvidence.length) diagnosis.push({tone: "green", icon: ThumbsUp, text: "Cap RA no assolit amb les dades actuals."});
  if (deliveryPct < 80) diagnosis.push({tone: "amber", icon: AlertTriangle, text: `El percentatge de lliuraments és del ${deliveryPct.toFixed(0)}%; hi ha activitats pendents de lliurar.`});
  else diagnosis.push({tone: "green", icon: ThumbsUp, text: `El percentatge de lliuraments és del ${deliveryPct.toFixed(0)}%.`});

  for (const r of raRows) if (r.status === "assolit" && r.score! >= 7 && strengths.length < 5) strengths.push(`${r.ra.code} consolidat (${r.score!.toFixed(2)}).`);
  if (trendDelta > .1 && strengths.length < 5) strengths.push(`Bona evolució global (${trendDelta > 0 ? "+" : ""}${trendDelta.toFixed(2)}).`);
  if (deliveryPct >= 90 && strengths.length < 5) strengths.push(`Alt percentatge de lliuraments (${deliveryPct.toFixed(0)}%).`);
  if (typeRows[0]?.average !== null && typeRows[0]?.average !== undefined && typeRows[0].average >= 7 && strengths.length < 5) strengths.push(`Bon rendiment en ${typeRows[0].type.name} (${typeRows[0].average.toFixed(2)}).`);

  for (const r of riskRas.slice(0, 3)) if (improve.length < 5) improve.push(`${r.ra.code} no assolit.`);
  if (deliveryPct < 80 && improve.length < 5) improve.push(`Percentatge de lliuraments per sota del desitjable (${deliveryPct.toFixed(0)}%).`);
  if (calc.globalCoverage < 50 && improve.length < 5) improve.push(`Cobertura encara parcial (${calc.globalCoverage.toFixed(0)}%); la projecció és provisional.`);
  if (trendDelta < -.1 && improve.length < 5) improve.push(`Tendència negativa des del 1r trimestre (${trendDelta.toFixed(2)}).`);

  if (riskRas.length) actions.push(`Fer seguiment de la propera evidència de ${riskRas.map(r => r.ra.code).join(", ")}.`);
  if (deliveryPct < 80) actions.push("Reforçar la constància en els lliuraments.");
  if (calc.globalCoverage < 50) actions.push("Recollir més evidències abans de treure conclusions fermes.");
  if (!actions.length) actions.push("Mantenir el seguiment habitual; no hi ha cap actuació prioritària detectada.");
 }
 if (!strengths.length) strengths.push("Encara no hi ha prou evidències per destacar fortaleses.");
 if (!improve.length) improve.push("Cap aspecte prioritari detectat amb les dades actuals.");

 return {calc, calcT1, hasStudentEvidence, trendDelta, groupAverage, groupT1Average, raRows, withEvidence, achievedCount, riskRas, activitiesTotal: activitiesAll.length, delivered, deliveryPct, typeRows, diagnosis, strengths, improve, actions};
}

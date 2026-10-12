import {countsForGrade, newId, nowIso, type AcademicCourse, type Activity, type AppDatabase, type DiagnosticResult, type Grade, type Group} from "../model/domain.ts";
import {recordGradeChange} from "./database.ts";
import type {ParsedDiagnostic} from "./diagnosticParser.ts";

export const diagnosticActivities = (course: AcademicCourse): Activity[] => course.configuration.activities.filter(a => !countsForGrade(a) && a.status === "active");

/** Crea l'activitat de l'avaluació inicial (sense tipus ni relacions amb CA: no pondera mai). */
export function createDiagnosticActivity(course: AcademicCourse, name: string, id: string = newId("activity")): Activity {
  const cfg = course.configuration;
  const activity: Activity = {id, name: name.trim(), activityTypeId: "", term: 1, date: null, order: cfg.activities.length + 1, status: "active", session: "diagnostica", recoversRaIds: []};
  cfg.activities.push(activity);
  for (const group of course.groups) group.activityStates.push({activityId: activity.id, automaticEvaluatedAt: null, manualOverride: null, locked: false});
  return activity;
}

export interface ImportDiagnosticInput {
  activityId: string;
  enrollmentId: string;
  parsed: ParsedDiagnostic;
  fileName: string;
  attachmentId: string | null;
}

/**
 * Desa el resultat d'un qüestionari i en reflecteix la nota a l'activitat diagnòstica
 * (visible a Notes). Substitueix un resultat anterior del mateix alumne i la mateixa activitat.
 * Retorna l'identificador del PDF substituït, perquè qui crida n'esborri la còpia.
 */
export function applyDiagnosticResult(database: AppDatabase, group: Group, input: ImportDiagnosticInput): {replacedAttachmentId: string | null; replaced: boolean} {
  const {activityId, enrollmentId, parsed} = input;
  if (group.activityStates.find(s => s.activityId === activityId)?.locked) throw new Error("L'activitat de l'avaluació inicial està bloquejada. Desbloqueja-la a Notes per importar-hi resultats.");
  const previous = group.diagnostics.find(r => r.activityId === activityId && r.enrollmentId === enrollmentId);
  group.diagnostics = group.diagnostics.filter(r => r !== previous);
  const result: DiagnosticResult = {
    id: newId("diagnostic"), activityId, enrollmentId, title: parsed.title, unit: parsed.unit, submittedAt: parsed.submittedAt, deliveryNumber: parsed.deliveryNumber,
    score: parsed.score, correct: parsed.correct, total: parsed.total, blocks: parsed.blocks, questions: parsed.questions,
    activeMinutes: parsed.activeMinutes, estimatedMinutes: parsed.estimatedMinutes, sessions: parsed.sessions, integrity: parsed.integrity, fingerprint: parsed.fingerprint,
    warnings: parsed.warnings, fileName: input.fileName, attachmentId: input.attachmentId, importedAt: nowIso(), comment: previous?.comment,
  };
  group.diagnostics.push(result);

  let grade = group.grades.find(g => g.enrollmentId === enrollmentId && g.activityId === activityId);
  const before = grade ? structuredClone(grade) : null;
  if (!grade) {
    grade = {id: newId("grade"), enrollmentId, activityId, status: "pending", baseValue: null, bonuses: [], updatedAt: nowIso()} satisfies Grade;
    group.grades.push(grade);
  }
  grade.status = "graded"; grade.baseValue = Math.round(parsed.score * 100) / 100; grade.updatedAt = nowIso();
  recordGradeChange(database, before, grade, "Importació de qüestionari diagnòstic");
  return {replacedAttachmentId: previous?.attachmentId ?? null, replaced: !!previous};
}

/** Elimina el resultat i la nota que se'n derivava. Retorna el PDF que cal esborrar. */
export function removeDiagnosticResult(database: AppDatabase, group: Group, resultId: string): string | null {
  const result = group.diagnostics.find(r => r.id === resultId);
  if (!result) return null;
  group.diagnostics = group.diagnostics.filter(r => r !== result);
  const grade = group.grades.find(g => g.enrollmentId === result.enrollmentId && g.activityId === result.activityId);
  if (grade) {
    const before = structuredClone(grade);
    group.grades = group.grades.filter(g => g !== grade);
    recordGradeChange(database, before, null, "Eliminació de qüestionari diagnòstic");
  }
  return result.attachmentId;
}

/** Elimina l'activitat diagnòstica amb les notes, els resultats i l'historial. Retorna els PDF que cal esborrar. */
export function deleteDiagnosticActivity(database: AppDatabase, course: AcademicCourse, activityId: string): string[] {
  const attachments: string[] = [];
  const removedGradeIds = new Set<string>();
  for (const group of course.groups) {
    for (const grade of group.grades.filter(g => g.activityId === activityId)) removedGradeIds.add(grade.id);
    for (const result of group.diagnostics.filter(r => r.activityId === activityId)) if (result.attachmentId) attachments.push(result.attachmentId);
    group.grades = group.grades.filter(g => g.activityId !== activityId);
    group.activityStates = group.activityStates.filter(s => s.activityId !== activityId);
    group.diagnostics = group.diagnostics.filter(r => r.activityId !== activityId);
  }
  database.gradeHistory = database.gradeHistory.filter(h => !removedGradeIds.has(h.gradeId));
  course.configuration.activities = course.configuration.activities.filter(a => a.id !== activityId);
  return attachments;
}

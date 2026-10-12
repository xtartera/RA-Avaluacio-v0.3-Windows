import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {parseDiagnosticPdf, type PdfItem} from "../src/controllers/diagnosticParser.ts";
import {applyDiagnosticResult, createDiagnosticActivity, deleteDiagnosticActivity, diagnosticActivities, removeDiagnosticResult} from "../src/controllers/diagnostics.ts";
import {activityInsights, activityWeights, calculateStudent, deliveryRate, groupAverage} from "../src/model/calculation.ts";
import {createCourse, migrateDatabase, newEnrollment, newId, nowIso, type AppDatabase} from "../src/model/domain.ts";

const parsed = parseDiagnosticPdf(JSON.parse(readFileSync(new URL("./fixtures/diagnostic-ut1-items.json", import.meta.url), "utf8")) as PdfItem[][]);

function fixture() {
  const course = createCourse("2026–2027"), group = course.groups[0], config = course.configuration;
  const type = {id: newId("type"), name: "Projecte", weight: 1, status: "active" as const};
  const ra = {id: newId("ra"), code: "RA1", description: "RA de prova", order: 1, status: "active" as const};
  const ca = {id: newId("ca"), learningResultId: ra.id, code: "1.A", description: "CA de prova", order: 1, status: "active" as const};
  const activity = {id: newId("activity"), name: "A1", activityTypeId: type.id, term: 1, date: null, order: 1, status: "active" as const, session: "ordinaria" as const, recoversRaIds: []};
  config.activityTypes = [type]; config.learningResults = [ra]; config.criteria = [ca]; config.activities = [activity];
  config.links = [{id: newId("link"), activityId: activity.id, criterionId: ca.id, allocation: 1}];
  for (let i = 0; i < 6; i++) {
    const student = {id: newId("student"), name: `Alumne ${i + 1}`}, enrollment = newEnrollment(student.id, group.id);
    group.students.push(student); group.enrollments.push(enrollment);
    group.grades.push({id: newId("grade"), enrollmentId: enrollment.id, activityId: activity.id, status: "graded", baseValue: 6, bonuses: [], updatedAt: nowIso()});
  }
  const database: AppDatabase = {schemaVersion: 1, courses: [course], gradeHistory: []};
  return {course, group, database};
}

test("l'avaluació inicial no altera cap càlcul de nota", () => {
  const {course, group, database} = fixture();
  const enrollment = group.enrollments[0].id;
  const before = {calc: calculateStudent(course, group, enrollment), avg: groupAverage(course, group), delivery: deliveryRate(course, group), weights: [...activityWeights(course)], insights: activityInsights(course, group).length};

  const activity = createDiagnosticActivity(course, "Avaluació inicial UT1");
  // Prou notes perquè l'activitat es consideri «avaluada» (5 o més).
  for (const e of group.enrollments) applyDiagnosticResult(database, group, {activityId: activity.id, enrollmentId: e.id, parsed, fileName: "a.pdf", attachmentId: newId("pdf")});

  const after = {calc: calculateStudent(course, group, enrollment), avg: groupAverage(course, group), delivery: deliveryRate(course, group), weights: [...activityWeights(course)], insights: activityInsights(course, group).length};
  assert.deepEqual(after.calc.globalScore, before.calc.globalScore);
  assert.deepEqual(after.calc.globalCoverage, before.calc.globalCoverage);
  assert.deepEqual([...after.calc.learningResults], [...before.calc.learningResults]);
  assert.equal(after.avg, before.avg);
  assert.equal(after.delivery, before.delivery);
  assert.deepEqual(after.weights, before.weights);
  assert.equal(after.insights, before.insights);
});

test("importar crea resultat i nota; reimportar el substitueix", () => {
  const {course, group, database} = fixture();
  const activity = createDiagnosticActivity(course, "Avaluació inicial UT1");
  assert.deepEqual(diagnosticActivities(course).map(a => a.id), [activity.id]);
  const e = group.enrollments[0].id;
  const first = applyDiagnosticResult(database, group, {activityId: activity.id, enrollmentId: e, parsed, fileName: "a.pdf", attachmentId: "pdf-1"});
  assert.deepEqual(first, {replaced: false, replacedAttachmentId: null});
  assert.equal(group.diagnostics.length, 1);
  const grade = group.grades.find(g => g.enrollmentId === e && g.activityId === activity.id)!;
  assert.deepEqual([grade.status, grade.baseValue], ["graded", 8]);
  const second = applyDiagnosticResult(database, group, {activityId: activity.id, enrollmentId: e, parsed: {...parsed, score: 9}, fileName: "b.pdf", attachmentId: "pdf-2"});
  assert.deepEqual(second, {replaced: true, replacedAttachmentId: "pdf-1"});
  assert.equal(group.diagnostics.length, 1);
  assert.equal(group.grades.filter(g => g.activityId === activity.id).length, 1);
  assert.equal(group.grades.find(g => g.activityId === activity.id)!.baseValue, 9);
  assert.equal(database.gradeHistory.length, 2);
});

test("una activitat bloquejada no accepta importacions", () => {
  const {course, group, database} = fixture();
  const activity = createDiagnosticActivity(course, "Avaluació inicial UT1");
  group.activityStates.find(s => s.activityId === activity.id)!.locked = true;
  assert.throws(() => applyDiagnosticResult(database, group, {activityId: activity.id, enrollmentId: group.enrollments[0].id, parsed, fileName: "a.pdf", attachmentId: null}), /bloquejada/);
  assert.equal(group.diagnostics.length, 0);
});

test("eliminar un resultat o l'activitat neteja notes, historial i PDF", () => {
  const {course, group, database} = fixture();
  const activity = createDiagnosticActivity(course, "Avaluació inicial UT1");
  const [a, b] = group.enrollments;
  applyDiagnosticResult(database, group, {activityId: activity.id, enrollmentId: a.id, parsed, fileName: "a.pdf", attachmentId: "pdf-a"});
  applyDiagnosticResult(database, group, {activityId: activity.id, enrollmentId: b.id, parsed, fileName: "b.pdf", attachmentId: "pdf-b"});
  assert.equal(removeDiagnosticResult(database, group, group.diagnostics[0].id), "pdf-a");
  assert.equal(group.grades.some(g => g.enrollmentId === a.id && g.activityId === activity.id), false);
  assert.deepEqual(deleteDiagnosticActivity(database, course, activity.id), ["pdf-b"]);
  assert.equal(course.configuration.activities.some(x => x.id === activity.id), false);
  assert.equal(group.grades.some(g => g.activityId === activity.id), false);
  assert.equal(group.diagnostics.length, 0);
  assert.equal(group.activityStates.some(s => s.activityId === activity.id), false);
});

test("una base de dades antiga es migra amb la llista de diagnòstics buida", () => {
  const {course, database} = fixture();
  for (const g of course.groups) delete (g as Partial<typeof g>).diagnostics;
  migrateDatabase(database);
  assert.ok(course.groups.every(g => Array.isArray(g.diagnostics) && g.diagnostics.length === 0));
});

test("reimportar un resultat conserva el comentari de l'informe d'avaluació inicial", () => {
  const {course, group, database} = fixture();
  const activity = createDiagnosticActivity(course, "Avaluació inicial UT1");
  const e = group.enrollments[0].id;
  applyDiagnosticResult(database, group, {activityId: activity.id, enrollmentId: e, parsed, fileName: "a.pdf", attachmentId: null});
  group.diagnostics[0].comment = "Revisar GPO a la primera setmana.";
  applyDiagnosticResult(database, group, {activityId: activity.id, enrollmentId: e, parsed: {...parsed, score: 9}, fileName: "b.pdf", attachmentId: null});
  assert.equal(group.diagnostics[0].comment, "Revisar GPO a la primera setmana.");
  assert.equal(group.diagnostics[0].score, 9);
});

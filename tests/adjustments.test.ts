import assert from "node:assert/strict";
import test from "node:test";
import {calculateFinalStudent, calculateStudent, raIsAchieved} from "../src/model/calculation.ts";
import {buildSeguretatCourse} from "../src/model/templates/seguretat0226.ts";
import {summarizeStudent} from "../src/model/studentSummary.ts";
import {analyzeUnitResults} from "../src/model/unitResults.ts";
import {newEnrollment, newId, nowIso} from "../src/model/domain.ts";

function setup() {
  const course = buildSeguretatCourse("2026–2027", ["A"]), group = course.groups[0], cfg = course.configuration;
  cfg.minRaCoverage = 0;
  const students = ["A", "B", "C", "D", "E", "F"].map(name => ({id: newId("student"), name}));
  for (const s of students) { group.students.push(s); group.enrollments.push(newEnrollment(s.id, group.id)); }
  const enrollment = group.enrollments[0];
  const grade = (eid: string, name: string, v: number) => group.grades.push({id: newId("g"), enrollmentId: eid, activityId: cfg.activities.find(a => a.name === name)!.id, status: "graded", baseValue: v, bonuses: [], updatedAt: nowIso()});
  // Tot el grup té nota a PE2.1 i A2.1.1 (així s'avaluen); el primer alumne suspèn l'examen.
  for (const e of group.enrollments) for (const n of ["PE2.1", "A2.1.1"]) grade(e.id, n, e.id === enrollment.id && n === "PE2.1" ? 4 : 9);
  const ra2 = cfg.learningResults.find(r => r.code === "RA2")!;
  return {course, group, cfg, enrollment, ra2, grade};
}

test("ajust d'RA: substitueix la nota, treu el bloqueig i arriba a resums i resultats per UT", () => {
  const f = setup();
  const before = calculateStudent(f.course, f.group, f.enrollment.id);
  assert.equal(raIsAchieved(before.learningResults.get(f.ra2.id)), false);
  f.group.raAdjustments!.push({id: newId("adj"), enrollmentId: f.enrollment.id, raId: f.ra2.id, value: 6, reason: "Evolució", createdAt: nowIso()});
  const after = calculateStudent(f.course, f.group, f.enrollment.id), ra = after.learningResults.get(f.ra2.id)!;
  assert.equal(ra.score, 6); assert.equal(ra.accumulated, 6); assert.equal(ra.failingActivities, 0);
  assert.ok(ra.adjusted && ra.adjusted.calculated !== 6);
  assert.equal(raIsAchieved(ra), true);
  const summary = summarizeStudent(f.course, f.group, f.enrollment.id);
  assert.equal(summary.ras.find(r => r.code === "RA2")!.state, "assolit");
  assert.equal(summary.ras.find(r => r.code === "RA2")!.requiredFailed, false);
  const ut = analyzeUnitResults(f.course, f.group, f.enrollment.id, "A").find(u => u.ras.some(r => r.code === "RA2"))!;
  assert.equal(ut.ras[0].outcome, "superat");
  // Un ajust per sota del mínim suspèn l'RA encara que l'examen sigui bo.
  f.group.raAdjustments![0].value = 3;
  assert.equal(raIsAchieved(calculateStudent(f.course, f.group, f.enrollment.id).learningResults.get(f.ra2.id)), false);
});

test("ajust de la nota final: substitueix la nota i decideix si se supera", () => {
  const f = setup();
  assert.equal(summarizeStudent(f.course, f.group, f.enrollment.id).status, "no-superat");
  f.group.finalAdjustments!.push({id: newId("adj"), enrollmentId: f.enrollment.id, value: 5, reason: "Junta d'avaluació", createdAt: nowIso()});
  const c = calculateStudent(f.course, f.group, f.enrollment.id);
  assert.equal(c.globalScore, 5);
  assert.ok(c.finalAdjustment && c.finalAdjustment.value === 5);
  const s = summarizeStudent(f.course, f.group, f.enrollment.id);
  assert.equal(s.status, "superat"); assert.equal(s.projected, 5);
  assert.equal(calculateFinalStudent(f.course, f.group, f.enrollment.id).modulePassed, true);
  f.group.finalAdjustments![0].value = 4;
  assert.equal(summarizeStudent(f.course, f.group, f.enrollment.id).status, "no-superat");
  // Els altres alumnes no es toquen.
  assert.notEqual(calculateStudent(f.course, f.group, f.group.enrollments[1].id).globalScore, 4);
});

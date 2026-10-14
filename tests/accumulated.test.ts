import assert from "node:assert/strict";
import test from "node:test";
import {calculateStudent} from "../src/model/calculation.ts";
import {createCourse, newEnrollment, newId, nowIso} from "../src/model/domain.ts";

/**
 * Un RA amb dos CA:
 *   CA-A: activitats A1 i A2 (cada activitat hi aporta el 100 %)
 *   CA-B: només l'activitat A3
 * Les 3 activitats pesen igual (33,3 % cada una): CA-A pesa 2/3 i CA-B 1/3. Només es corregeix A1 (l'alumne 1 té un 10, la resta un 6).
 */
function fixture(raAveraging: "simple" | "weighted" = "simple", grade = 10) {
  const course = createCourse("2026–2027"), group = course.groups[0], cfg = course.configuration;
  cfg.raAveraging = raAveraging; cfg.minRaCoverage = 0;
  const type = {id: newId("type"), name: "Projecte", weight: 1, status: "active" as const};
  const ra = {id: newId("ra"), code: "RA1", description: "RA", order: 1, status: "active" as const};
  const caA = {id: newId("ca"), learningResultId: ra.id, code: "1.A", description: "A", order: 1, status: "active" as const};
  const caB = {id: newId("ca"), learningResultId: ra.id, code: "1.B", description: "B", order: 2, status: "active" as const};
  const acts = [1, 2, 3].map(i => ({id: newId("activity"), name: `A${i}`, activityTypeId: type.id, term: 1, date: null, order: i, status: "active" as const, session: "ordinaria" as const, recoversRaIds: []}));
  cfg.activityTypes = [type]; cfg.learningResults = [ra]; cfg.criteria = [caA, caB]; cfg.activities = acts;
  cfg.links = [
    {id: newId("l"), activityId: acts[0].id, criterionId: caA.id, allocation: 1},
    {id: newId("l"), activityId: acts[1].id, criterionId: caA.id, allocation: 1},
    {id: newId("l"), activityId: acts[2].id, criterionId: caB.id, allocation: 1},
  ];
  for (let i = 0; i < 6; i++) {
    const student = {id: newId("student"), name: `Alumne ${i + 1}`}, enrollment = newEnrollment(student.id, group.id);
    group.students.push(student); group.enrollments.push(enrollment);
    group.grades.push({id: newId("grade"), enrollmentId: enrollment.id, activityId: acts[0].id, status: "graded", baseValue: i === 0 ? grade : 6, bonuses: [], updatedAt: nowIso()});
  }
  return {course, group, ra, enrollment: group.enrollments[0]};
}

test("estimada i acumulada: la primera ignora el que no té evidència, la segona ho compta com a 0", () => {
  const f = fixture();
  const calc = calculateStudent(f.course, f.group, f.enrollment.id), r = calc.learningResults.get(f.ra.id)!;
  // Estimada: només hi ha evidència al CA-A i només a A1 → 10.
  assert.equal(r.score, 10);
  // Acumulada: CA-A = (10·1/3·.5 + 0 + 0) / (2 · 1/3 · .5) = 5; CA-B = 0 → mitjana simple 2,5.
  assert.equal(Math.round(r.accumulated * 1e9) / 1e9, 2.5);
});

test("la nota acumulada mai no supera l'estimada i coincideixen quan tot està corregit", () => {
  const f = fixture();
  const r = calculateStudent(f.course, f.group, f.enrollment.id).learningResults.get(f.ra.id)!;
  assert.ok(r.accumulated <= r.score);
  // Es corregeixen A2 i A3 amb un 10: no queda res pendent.
  for (const act of f.course.configuration.activities.slice(1)) for (const e of f.group.enrollments) f.group.grades.push({id: newId("g"), enrollmentId: e.id, activityId: act.id, status: "graded", baseValue: 10, bonuses: [], updatedAt: nowIso()});
  const done = calculateStudent(f.course, f.group, f.enrollment.id).learningResults.get(f.ra.id)!;
  assert.equal(Math.round(done.accumulated * 1e9) / 1e9, 10);
  assert.equal(Math.round(done.score * 1e9) / 1e9, 10);
});

test("nota global acumulada = punts guanyats sobre 10 (Σ RA acumulada × pes de l'RA)", () => {
  const f = fixture();
  const calc = calculateStudent(f.course, f.group, f.enrollment.id);
  // L'únic RA pesa el 100 % del mòdul: 2,5 punts sobre 10.
  assert.equal(Math.round(calc.globalAccumulated * 1e9) / 1e9, 2.5);
});

test("una nota amb bonificació (10,5) s'acumula sense talls", () => {
  const f = fixture();
  const grade = f.group.grades.find(g => g.enrollmentId === f.enrollment.id)!;
  grade.baseValue = 10; grade.bonuses = [{id: newId("b"), value: .5, reason: "x", source: "manual", createdAt: nowIso()}];
  const r = calculateStudent(f.course, f.group, f.enrollment.id).learningResults.get(f.ra.id)!;
  assert.equal(Math.round(r.accumulated * 1e9) / 1e9, 2.625); // CA-A = 10,5 / 2 = 5,25; CA-B = 0 → 2,625
});

test("en mode ponderat, els CA pesen segons el seu pes global", () => {
  const f = fixture("weighted");
  const r = calculateStudent(f.course, f.group, f.enrollment.id).learningResults.get(f.ra.id)!;
  // CA-A pesa 2/3 i val 5; CA-B pesa 1/3 i val 0 → (5 · 2/3) / 1 = 3,333 (la mitjana simple dona 2,5).
  assert.equal(Math.round(r.accumulated * 1e6) / 1e6, 3.333333);
});

test("una activitat no presentada o pendent compta 0 a l'acumulada", () => {
  const f = fixture();
  const grade = f.group.grades.find(g => g.enrollmentId === f.enrollment.id)!;
  grade.status = "not_presented"; grade.baseValue = null;
  const r = calculateStudent(f.course, f.group, f.enrollment.id).learningResults.get(f.ra.id)!;
  assert.equal(r.accumulated, 0);
});

import assert from "node:assert/strict";
import test from "node:test";
import {activityShareInRa, calculateStudent, raWeights} from "../src/model/calculation.ts";
import {explicitWeightGap, explicitWeightIssues} from "../src/model/explicitWeights.ts";
import {createCourse, newEnrollment, newId, nowIso} from "../src/model/domain.ts";

/** Dos RA (60 % / 40 % del mòdul). RA1: examen 80 % + pràctica 20 %; RA2: una sola activitat. Una Apte sense pes. */
function fixture() {
  const course = createCourse("2026–2027"), group = course.groups[0], cfg = course.configuration;
  cfg.weightMode = "explicit"; cfg.raAveraging = "weighted"; cfg.minRaCoverage = 0;
  const type = {id: newId("type"), name: "Qualsevol", weight: 1, status: "active" as const};
  const ra1 = {id: newId("ra"), code: "RA1", description: "", order: 1, status: "active" as const, moduleWeight: 0.6};
  const ra2 = {id: newId("ra"), code: "RA2", description: "", order: 2, status: "active" as const, moduleWeight: 0.4};
  const ca1 = {id: newId("ca"), learningResultId: ra1.id, code: "1.A", description: "", order: 1, status: "active" as const};
  const ca2 = {id: newId("ca"), learningResultId: ra2.id, code: "2.A", description: "", order: 1, status: "active" as const};
  const mk = (name: string, order: number, shares: {raId: string; share: number}[]) => ({id: newId("activity"), name, activityTypeId: type.id, term: 1, date: null, order, status: "active" as const, session: "ordinaria" as const, recoversRaIds: [], raShares: shares});
  const exam = mk("Examen", 1, [{raId: ra1.id, share: 0.8}]), prac = mk("Pràctica", 2, [{raId: ra1.id, share: 0.2}]), emp = mk("Empresa", 3, [{raId: ra2.id, share: 1}]), apte = mk("Apte", 4, []);
  cfg.activityTypes = [type]; cfg.learningResults = [ra1, ra2]; cfg.criteria = [ca1, ca2]; cfg.activities = [exam, prac, emp, apte];
  cfg.links = [
    {id: newId("l"), activityId: exam.id, criterionId: ca1.id, allocation: 1}, {id: newId("l"), activityId: prac.id, criterionId: ca1.id, allocation: 1},
    {id: newId("l"), activityId: apte.id, criterionId: ca1.id, allocation: 1}, {id: newId("l"), activityId: emp.id, criterionId: ca2.id, allocation: 1},
  ];
  const student = {id: newId("student"), name: "A"}, enrollment = newEnrollment(student.id, group.id);
  group.students.push(student); group.enrollments.push(enrollment);
  return {course, group, enrollment, exam, prac, emp, apte, ra1, ra2};
}

const grade = (f: ReturnType<typeof fixture>, activityId: string, v: number) => f.group.grades.push({id: newId("g"), enrollmentId: f.enrollment.id, activityId, status: "graded", baseValue: v, bonuses: [], updatedAt: nowIso()});

test("pesos explícits: el pes de l'RA al mòdul i el de cada activitat dins l'RA surten tal com s'escriuen", () => {
  const f = fixture();
  const w = raWeights(f.course);
  assert.ok(Math.abs(w.get(f.ra1.id)! - 0.6) < 1e-9);
  assert.ok(Math.abs(w.get(f.ra2.id)! - 0.4) < 1e-9);
  const share = activityShareInRa(f.course, f.ra1.id);
  assert.ok(Math.abs(share.get(f.exam.id)! - 0.8) < 1e-9);
  assert.ok(Math.abs(share.get(f.prac.id)! - 0.2) < 1e-9);
  assert.ok(!share.get(f.apte.id)); // l'Apte no pesa
});

test("pesos explícits: la nota de l'RA i la del mòdul segueixen els percentatges", () => {
  const f = fixture();
  grade(f, f.exam.id, 5); grade(f, f.prac.id, 10); grade(f, f.emp.id, 8);
  for (const id of [f.exam.id, f.prac.id, f.emp.id]) f.group.activityStates.push({activityId: id, automaticEvaluatedAt: nowIso(), manualOverride: null, locked: false});
  const c = calculateStudent(f.course, f.group, f.enrollment.id);
  assert.ok(Math.abs(c.learningResults.get(f.ra1.id)!.score - 6) < 1e-9); // 0,8 × 5 + 0,2 × 10
  assert.ok(Math.abs(c.learningResults.get(f.ra2.id)!.score - 8) < 1e-9);
  assert.ok(Math.abs(c.globalScore - 6.8) < 1e-9); // 0,6 × 6 + 0,4 × 8
  assert.ok(Math.abs(c.globalAccumulated - 6.8) < 1e-9);
});

test("avisos: pesos que no sumen i activitats sense vincle", () => {
  const f = fixture();
  assert.deepEqual(explicitWeightIssues(f.course), []);
  f.ra2.moduleWeight = 0.3; // 90 %: falta un RA per afegir, és vàlid
  assert.deepEqual(explicitWeightIssues(f.course), []);
  assert.ok(Math.abs(explicitWeightGap(f.course) - 0.1) < 1e-9);
  f.ra2.moduleWeight = 0.5; // 110 %: no té sentit
  assert.match(explicitWeightIssues(f.course).join(" "), /sumen 110 % i no poden passar del 100 %/);
  f.ra2.moduleWeight = 0.4;
  f.exam.raShares = [{raId: f.ra1.id, share: 0.5}];
  assert.match(explicitWeightIssues(f.course).join(" "), /RA1 sumen 70 %/);
  f.exam.raShares = [{raId: f.ra1.id, share: 0.8}];
  f.course.configuration.links = f.course.configuration.links.filter(l => l.activityId !== f.exam.id);
  assert.match(explicitWeightIssues(f.course).join(" "), /Examen té part de RA1 però no està vinculada/);
});

test("el mode per tipus no canvia: sense weightMode explícit, els camps nous s'ignoren", () => {
  const f = fixture();
  f.course.configuration.weightMode = "types";
  f.course.configuration.activityTypes[0].weight = 1;
  const w = raWeights(f.course);
  assert.ok(Math.abs([...w.values()].reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.deepEqual(explicitWeightIssues(f.course), []);
});

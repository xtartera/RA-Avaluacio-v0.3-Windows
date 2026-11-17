import assert from "node:assert/strict";
import test from "node:test";
import {activityShareInRa, calculateStudent, raWeights} from "../src/model/calculation.ts";
import {explicitWeightGap, explicitWeightIssues} from "../src/model/explicitWeights.ts";
import {newEnrollment, newId, nowIso} from "../src/model/domain.ts";
import {buildSeguretatCourse} from "../src/model/templates/seguretat0226.ts";

test("plantilla de Seguretat informàtica: estructura i pesos de la programació", () => {
  const course = buildSeguretatCourse("2026–2027"), cfg = course.configuration;
  assert.equal(cfg.moduleName, "Seguretat informàtica");
  assert.equal(cfg.weightMode, "explicit");
  assert.equal(cfg.raAveraging, "weighted");
  assert.deepEqual(cfg.learningResults.map(r => r.code), ["RA1", "RA2", "RA3", "RA4", "RA5"]);
  assert.deepEqual(cfg.learningResults.map(r => cfg.criteria.filter(c => c.learningResultId === r.id).length), [9, 10, 5, 8, 6]);
  assert.equal(cfg.workUnits.length, 5);
  assert.equal(cfg.activities.length, 32);
  assert.deepEqual(explicitWeightIssues(course), []); // activitats = 100 % de cada RA i RA ≤ 100 %
  assert.ok(Math.abs(explicitWeightGap(course) - 0.1) < 1e-9); // falta el 10 % de l'RA6 (empresa)
  // Pesos de la programació tal qual (16/18/18/26/12; sumen 90 %).
  const w = raWeights(course), exp = [16, 18, 18, 26, 12].map(x => x / 100);
  cfg.learningResults.forEach((r, i) => assert.ok(Math.abs(w.get(r.id)! - exp[i]) < 1e-9, r.code));
  // L'examen de la UD1 pesa el 80 % de l'RA1; les Apte no pesen.
  const share = activityShareInRa(course, cfg.learningResults[0].id);
  assert.ok(Math.abs(share.get(cfg.activities.find(a => a.name === "PE1.1")!.id)! - 0.8) < 1e-9);
  assert.ok(!share.get(cfg.activities.find(a => a.name === "A1.1.1")!.id));
  // Cada UD tanca el seu RA i té l'examen i les Apte com a obligatòries.
  const ud1 = cfg.workUnits[0];
  assert.deepEqual(ud1.requiredActivityIds.map(id => cfg.activities.find(a => a.id === id)!.name), ["A1.1.1", "A1.1.2", "A1.1.3", "A1.2.1", "PE1.1"]);
  assert.deepEqual(cfg.workUnits[2].requiredActivityIds.map(id => cfg.activities.find(a => a.id === id)!.name), ["PE3.1"]);
});

test("plantilla de Seguretat: amb un 10 a tot, la nota és 10; amb examen suspès, l'RA queda suspès per l'obligatòria", () => {
  const course = buildSeguretatCourse("2026–2027"), group = course.groups[0];
  const student = {id: newId("student"), name: "A"}, enrollment = newEnrollment(student.id, group.id);
  group.students.push(student); group.enrollments.push(enrollment);
  for (const a of course.configuration.activities) {
    const v = a.name === "PE2.1" ? 4 : 10;
    group.grades.push({id: newId("g"), enrollmentId: enrollment.id, activityId: a.id, status: "graded", baseValue: v, bonuses: [], updatedAt: nowIso()});
    group.activityStates.push({activityId: a.id, automaticEvaluatedAt: nowIso(), manualOverride: null, locked: false});
  }
  const c = calculateStudent(course, group, enrollment.id);
  // Punts reals sobre 10 amb els pesos tal qual (màxim 9): 1,6 + 0,18 × 5,56 + 1,8 + 2,6 + 1,2.
  assert.ok(Math.abs(c.globalAccumulated - 8.2008) < 1e-9);
  // La nota projectada es calcula sobre els RA que hi ha (90 %), no es divideix per 100.
  assert.ok(Math.abs(c.globalScore - 8.2008 / 0.9) < 1e-9);
  const ra = (code: string) => c.learningResults.get(course.configuration.learningResults.find(r => r.code === code)!.id)!;
  assert.ok(Math.abs(ra("RA1").score - 10) < 1e-9);
  // RA2: 74 % examen amb 4 + 26 % pràctiques amb 10 = 5,56, però l'examen (obligatori) no arriba al 5.
  assert.ok(Math.abs(ra("RA2").score - (0.74 * 4 + 0.26 * 10)) < 1e-9);
  assert.equal(ra("RA2").failingActivities, 1);
  assert.equal(ra("RA1").failingActivities, 0);
});

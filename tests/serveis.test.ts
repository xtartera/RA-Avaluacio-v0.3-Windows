import assert from "node:assert/strict";
import test from "node:test";
import {activityShareInRa, calculateStudent, raWeights} from "../src/model/calculation.ts";
import {explicitWeightGap, explicitWeightIssues} from "../src/model/explicitWeights.ts";
import {newEnrollment, newId, nowIso} from "../src/model/domain.ts";
import {programCodi, programContent, programHores, programHoursPlan, programValue, sequenceHours} from "../src/model/programacio.ts";
import {smxModuleOf} from "../src/model/programacioNormativa.ts";
import {buildServeisCourse} from "../src/model/templates/serveis0227.ts";

test("plantilla de Serveis de xarxa: estructura, pesos de la programació i coherència", () => {
  const course = buildServeisCourse("2026–2027"), cfg = course.configuration;
  assert.equal(cfg.moduleName, "Serveis de xarxa");
  assert.equal(cfg.weightMode, "explicit");
  assert.equal(cfg.roundingThreshold, .5);
  assert.equal(cfg.requiredActivityMinGrade, 4);
  assert.equal(course.groups.length, 2);
  assert.deepEqual(cfg.learningResults.map(r => r.code), ["RA1", "RA2", "RA3", "RA4", "RA5", "RA6", "RA7", "RA8"]);
  assert.deepEqual(cfg.learningResults.map(r => cfg.criteria.filter(c => c.learningResultId === r.id).length), [8, 8, 7, 7, 9, 7, 7, 10]);
  assert.equal(cfg.workUnits.length, 10);
  assert.equal(cfg.activities.length, 17); // Pt0, Pt1-8, Pe1-6 i Pe8, Prj
  assert.deepEqual(explicitWeightIssues(course), []); // activitats = 100 % de cada RA; el projecte reparteix per RA en proporció
  assert.ok(Math.abs(explicitWeightGap(course) - 0.1) < 1e-9); // falta l'RAemp
  const w = raWeights(course), exp = [13.5, 13.5, 9, 13.5, 13.5, 9, 9, 9].map(x => x / 100);
  cfg.learningResults.forEach((r, i) => assert.ok(Math.abs(w.get(r.id)! - exp[i]) < 1e-9, r.code));
  const byName = (n: string) => cfg.activities.find(a => a.name === n)!;
  const ra = (n: number) => cfg.learningResults[n - 1].id;
  const s1 = activityShareInRa(course, ra(1));
  assert.ok(Math.abs(s1.get(byName("Pt1").id)! - 0.3) < 1e-9);
  assert.ok(Math.abs(s1.get(byName("Pe1").id)! - 0.3) < 1e-9);
  assert.ok(Math.abs(s1.get(byName("Prj").id)! - 0.4) < 1e-9);
  const s7 = activityShareInRa(course, ra(7));
  assert.ok(Math.abs(s7.get(byName("Pt7").id)! - 1) < 1e-9);
  assert.ok(!s7.get(byName("Prj").id)); // l'RA7 no té projecte
  assert.ok(!activityShareInRa(course, ra(1)).get(byName("Pt0").id)); // la verificació de l'entorn no puntua
  assert.ok(!cfg.activities.some(a => a.name === "Pe7"));
});

test("Serveis de xarxa: amb un 10 a tot la nota és 10; amb una prova escrita suspesa l'RA queda suspès", () => {
  const course = buildServeisCourse("2026–2027"), group = course.groups[0];
  const student = {id: newId("student"), name: "A"}, enrollment = newEnrollment(student.id, group.id);
  group.students.push(student); group.enrollments.push(enrollment);
  for (const a of course.configuration.activities) {
    group.grades.push({id: newId("g"), enrollmentId: enrollment.id, activityId: a.id, status: "graded", baseValue: a.name === "Pe3" ? 3 : 10, bonuses: [], updatedAt: nowIso()});
    group.activityStates.push({activityId: a.id, automaticEvaluatedAt: nowIso(), manualOverride: null, locked: false});
  }
  const c = calculateStudent(course, group, enrollment.id);
  const ra = (code: string) => c.learningResults.get(course.configuration.learningResults.find(r => r.code === code)!.id)!;
  assert.ok(Math.abs(ra("RA1").score - 10) < 1e-9);
  assert.ok(Math.abs(ra("RA3").score - (0.3 * 3 + 0.7 * 10)) < 1e-9); // 30 % Pe3 + 30 % Pt3 + 40 % Prj
  assert.equal(ra("RA3").failingActivities, 1); // Pe3 < 4
  assert.equal(ra("RA1").failingActivities, 0);
});

test("la programació de Serveis de xarxa porta les hores, les seqüències i els textos del document del mòdul", () => {
  const course = buildServeisCourse("2026–2027"), c = programContent(course), plan = programHoursPlan(course, c);
  assert.equal(programCodi(course), "0227");
  assert.deepEqual(programHores(course), {centre: "132", empresa: "66"});
  assert.equal(smxModuleOf(course)!.codi, "0227");
  // Numeració AEA0-AEA9 respectada a partir del nom.
  assert.deepEqual(c.units.map(u => u.index), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(c.units[0].name, "Preparació de l'entorn de treball");
  assert.deepEqual(c.units.map(u => plan.unit[u.id]), [6, 12, 12, 12, 6, 12, 12, 12, 12, 36]);
  assert.equal(plan.assigned, 132);
  assert.deepEqual(plan.warnings, []);
  // Cada seqüència suma les hores de la seva AEA.
  const data = course.configuration.programacio!;
  for (const u of c.units) assert.equal(sequenceHours(data.units![u.id].sequencia!), plan.unit[u.id], u.name);
  // Qmp com al document i RAemp pendent.
  assert.match(c.qmp, /0,135·RA1 \+ 0,135·RA2 \+ 0,09·RA3 \+ 0,135·RA4 \+ 0,135·RA5 \+ 0,09·RA6 \+ 0,09·RA7 \+ 0,09·RA8 \+ 0,1·RAemp/);
  assert.equal(c.ras[0].inici, "22/09/2026");
  assert.match(c.ras[0].contingut, /Kea DHCP/);
  assert.match(programValue(course, "condicions"), /projecte/);
  assert.match(programValue(course, "recuperacio"), /Segona convocatòria/);
  // El projecte surt a l'AEA9 amb 7 RA.
  assert.deepEqual(c.units[9].ras, ["RA1", "RA2", "RA3", "RA4", "RA5", "RA6", "RA8"]);
});

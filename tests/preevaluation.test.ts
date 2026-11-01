import assert from "node:assert/strict";
import test from "node:test";
import {analyzeCurrentEvidence} from "../src/model/currentEvidence.ts";
import {buildPreevaluation, preevaluationComment} from "../src/model/preevaluation.ts";
import {createCourse, newEnrollment, newId, nowIso} from "../src/model/domain.ts";

function fixture(marks: (number | null)[], name = "Soler Puig, Laura") {
  const course = createCourse("2026–2027"), group = course.groups[0], cfg = course.configuration;
  cfg.minRaCoverage = 0;
  const type = {id: newId("type"), name: "Pràctica", weight: 1, status: "active" as const};
  const ra = {id: newId("ra"), code: "RA1", description: "RA", order: 1, status: "active" as const};
  const ca = {id: newId("ca"), learningResultId: ra.id, code: "1.A", description: "A", order: 1, status: "active" as const};
  const acts = [1, 2, 3, 4].map(i => ({id: newId("activity"), name: `A${i}`, activityTypeId: type.id, term: 1, date: null, order: i, status: "active" as const, session: "ordinaria" as const, recoversRaIds: []}));
  cfg.activityTypes = [type]; cfg.learningResults = [ra]; cfg.criteria = [ca]; cfg.activities = acts; cfg.workUnits = [];
  cfg.links = acts.map(a => ({id: newId("l"), activityId: a.id, criterionId: ca.id, allocation: 1}));
  for (let i = 0; i < 6; i++) {
    const student = {id: newId("student"), name: i === 0 ? name : `Alumne ${i}`}, enrollment = newEnrollment(student.id, group.id);
    group.students.push(student); group.enrollments.push(enrollment);
    for (let k = 0; k < 4; k++) { const v = i === 0 ? marks[k] : 8; group.grades.push({id: newId("g"), enrollmentId: enrollment.id, activityId: acts[k].id, status: v === null ? "not_presented" : "graded", baseValue: v, bonuses: [], updatedAt: nowIso()}); }
  }
  return {course, group, id: group.enrollments[0].id};
}

test("preavaluació: una fila per alumne actiu, ordenada i amb el color del semàfor", () => {
  const f = fixture([9, 9, 9, 9]);
  const rows = buildPreevaluation(f.course, f.group);
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.map(r => r.name), [...rows.map(r => r.name)].sort((a, b) => a.localeCompare(b, "ca")));
  assert.equal(rows.find(r => r.name === "SOLER PUIG, LAURA")!.color, "verd");
});

test("el comentari depèn dels resultats i no revela factors de context", () => {
  const comment = (marks: (number | null)[], observation?: {levels: Record<string, number>}) => { const f = fixture(marks); return preevaluationComment(analyzeCurrentEvidence(f.course, f.group, f.id, "X", {unitId: null}), observation); };
  assert.match(comment([10, 10, 9, 9]), /ha assolit amb èxit/);
  assert.match(comment([10, 10, 10, 0]), /no sempre lliura/);
  assert.match(comment([6, 6, 6, 6]), /constància/);
  assert.match(comment([2, 3, 2, 3]), /hàbits d'estudi/);
  assert.match(comment([0, 0, 0, 5]), /dediqui més temps/);
  assert.match(comment([3, 3, 3, 3], {levels: {autonomia: 1}}), /autonomia/);
  assert.doesNotMatch(comment([3, 3, 3, 3]), /llengua|nouvingut|TDAH/i);
  assert.match(preevaluationComment(null), /Encara no hi ha prou activitats/);
});

import assert from "node:assert/strict";
import test from "node:test";
import {analyzeJoint, buildJointStudents, jointCourses, studentKey} from "../src/model/joint.ts";
import {buildSeguretatCourse} from "../src/model/templates/seguretat0226.ts";
import {createCourse, newEnrollment, newId, nowIso, type AppDatabase} from "../src/model/domain.ts";

function setup() {
  const si = buildSeguretatCourse("2026–2027", ["A"]);
  const other = createCourse("2026–2027", undefined, false, ["A"]);
  other.configuration.moduleName = "Altre mòdul"; other.configuration.abbreviation = "ALT";
  const old = createCourse("2025–2026", undefined, false, ["A"]);
  const arch = createCourse("2026–2027", undefined, false, ["A"]); arch.archived = true;
  const add = (c: typeof si, name: string) => { const g = c.groups[0], s = {id: newId("student"), name}; g.students.push(s); g.enrollments.push(newEnrollment(s.id, g.id)); return g.enrollments[g.enrollments.length - 1]; };
  return {si, other, old, arch, add, db: {schemaVersion: 1, courses: [si, other, old, arch], gradeHistory: []} as AppDatabase};
}

test("la clau d'alumne ignora accents, majúscules, comes i l'ordre de cognoms i nom", () => {
  assert.equal(studentKey("HADDOUCHI BOUDOUH, AYMAN"), studentKey("Ayman Haddouchi Boudouh"));
  assert.equal(studentKey("Núria Pérez"), studentKey("nuria perez"));
  assert.notEqual(studentKey("Anna Puig"), studentKey("Anna Puig Soler"));
});

test("només entren els mòduls no arxivats del mateix curs acadèmic", () => {
  const f = setup();
  assert.deepEqual(jointCourses(f.db, f.si).map(c => c.id).sort(), [f.si.id, f.other.id].sort());
});

test("uneix els alumnes pel nom, marca els que només són a un mòdul i recull els ajustos del professor", () => {
  const f = setup(), courses = [f.other, f.si];
  f.add(f.si, "Ayman Haddouchi"); f.add(f.other, "HADDOUCHI, AYMAN");
  f.add(f.si, "Només Seguretat");
  const si1 = f.si.groups[0].enrollments[0];
  f.si.groups[0].finalAdjustments!.push({id: newId("adj"), enrollmentId: si1.id, value: 4, reason: "Junta", createdAt: nowIso()});
  const students = buildJointStudents(courses, "A");
  assert.equal(students.length, 2);
  const ayman = students.find(s => s.key === studentKey("Ayman Haddouchi"))!;
  assert.equal(ayman.present, 2);
  const siResult = ayman.modules[1];
  assert.equal(siResult.state, "no-superat"); assert.equal(siResult.projected, 4);
  assert.equal(siResult.finalAdjustment?.reason, "Junta");
  const only = students.find(s => s.name === "Només Seguretat")!;
  assert.equal(only.present, 1); assert.equal(only.modules[0].state, "absent");
  const an = analyzeJoint(courses, students);
  assert.equal(an.partial.length, 1); assert.equal(an.riskInOne.length, 1); assert.equal(an.riskInSeveral.length, 0);
  assert.equal(an.modules[1].adjusted, 1);
});

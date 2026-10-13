import assert from "node:assert/strict";
import test from "node:test";
import {calculateFinalStudent, calculateStudent, deliveryRate, isDelivered, raIsAchieved, raIsFailing, raIsProvisional} from "../src/model/calculation.ts";
import {createCourse, emptyConfiguration, migrateDatabase, newEnrollment, newId, nowIso, type AcademicCourse, type AppDatabase, type Group} from "../src/model/domain.ts";

/** Un RA amb 10 activitats iguals (10 % cadascuna) i 6 alumnes; només es qualifiquen les activitats indicades. */
function fixture(graded: {activity: number; value: number | "np"}[], opts: {requiredExam?: boolean} = {}) {
  const course = createCourse("2026–2027"), group = course.groups[0], cfg = course.configuration;
  const type = {id: newId("type"), name: "Projecte", weight: 1, status: "active" as const};
  const ra = {id: newId("ra"), code: "RA1", description: "RA de prova", order: 1, status: "active" as const};
  const ca = {id: newId("ca"), learningResultId: ra.id, code: "1.A", description: "CA", order: 1, status: "active" as const};
  const activities = Array.from({length: 10}, (_, i) => ({id: newId("activity"), name: `P${i + 1}`, activityTypeId: type.id, term: 1, date: null, order: i + 1, status: "active" as const, session: "ordinaria" as const, recoversRaIds: []}));
  cfg.activityTypes = [type]; cfg.learningResults = [ra]; cfg.criteria = [ca]; cfg.activities = activities;
  cfg.links = activities.map(a => ({id: newId("link"), activityId: a.id, criterionId: ca.id, allocation: 1}));
  if (opts.requiredExam) cfg.workUnits = [{id: newId("unit"), name: "UT1", activityIds: [activities[0].id], requiredActivityIds: [activities[0].id], learningResultIds: [ra.id], order: 1, status: "active"}];
  for (let i = 0; i < 6; i++) {
    const student = {id: newId("student"), name: `Alumne ${i + 1}`}, enrollment = newEnrollment(student.id, group.id);
    group.students.push(student); group.enrollments.push(enrollment);
    for (const g of graded) group.grades.push(g.value === "np"
      ? {id: newId("grade"), enrollmentId: enrollment.id, activityId: activities[g.activity].id, status: "not_presented", baseValue: null, bonuses: [], updatedAt: nowIso()}
      : {id: newId("grade"), enrollmentId: enrollment.id, activityId: activities[g.activity].id, status: "graded", baseValue: g.value, bonuses: [], updatedAt: nowIso()});
  }
  return {course, group, ra, enrollment: group.enrollments[0]};
}
const entry = (f: ReturnType<typeof fixture>) => calculateStudent(f.course, f.group, f.enrollment.id).learningResults.get(f.ra.id)!;

test("amb poca evidència (20 % < 25 %) l'RA és provisional: ni assolit ni no assolit", () => {
  const f = fixture([{activity: 0, value: 0}, {activity: 1, value: 10}]);
  const e = entry(f);
  assert.equal(Math.round(e.coverage), 20);
  assert.equal(e.score, 5); // el valor es calcula igualment, però no es valora
  assert.equal(e.provisional, true);
  assert.deepEqual([raIsProvisional(e), raIsAchieved(e), raIsFailing(e)], [true, false, false]);
});

test("un únic suspès en un projecte poc pesant ja no fa «no assolit» l'RA", () => {
  const f = fixture([{activity: 0, value: 0}]); // 10 % d'evidència, nota 0
  const e = entry(f);
  assert.equal(e.score, 0);
  assert.equal(raIsFailing(e), false);
  assert.equal(Math.round(calculateStudent(f.course, f.group, f.enrollment.id).globalCoverage), 10);
});

test("amb prou evidència (≥ 25 %) torna a valorar-se: no assolit si suspèn", () => {
  const f = fixture([{activity: 0, value: 0}, {activity: 1, value: 0}, {activity: 2, value: 2}]);
  const e = entry(f);
  assert.equal(e.provisional, false);
  assert.equal(raIsFailing(e), true);
  const ok = fixture([{activity: 0, value: 8}, {activity: 1, value: 7}, {activity: 2, value: 9}]);
  assert.equal(raIsAchieved(entry(ok)), true);
});

test("el llindar és configurable; amb 0 es manté el comportament anterior", () => {
  const f = fixture([{activity: 0, value: 0}]);
  f.course.configuration.minRaCoverage = 0;
  assert.equal(raIsFailing(entry(f)), true);
  f.course.configuration.minRaCoverage = 50;
  const g = fixture([{activity: 0, value: 0}, {activity: 1, value: 0}, {activity: 2, value: 0}, {activity: 3, value: 0}]);
  g.course.configuration.minRaCoverage = 50;
  assert.equal(entry(g).provisional, true); // 40 % < 50 %
});

test("un examen obligatori suspès marca l'RA encara que tingui poca evidència", () => {
  const f = fixture([{activity: 0, value: 2}], {requiredExam: true});
  const e = entry(f);
  assert.equal(e.failingActivities, 1);
  assert.equal(e.provisional, false);
  assert.equal(raIsFailing(e), true);
});

test("un RA provisional no es considera per recuperar a l'extraordinària ni dona el mòdul per superat", () => {
  const f = fixture([{activity: 0, value: 0}]);
  const final = calculateFinalStudent(f.course, f.group, f.enrollment.id);
  const r = final.learningResults.get(f.ra.id)!;
  assert.deepEqual([r.achieved, r.source], [false, "ordinaria"]);
  assert.equal(final.modulePassed, false);
});

test("un «No presentat» no compta com a lliurat", () => {
  assert.equal(isDelivered({status: "graded"}), true);
  assert.equal(isDelivered({status: "not_presented"}), false);
  assert.equal(isDelivered({status: "pending"}), false);
  assert.equal(isDelivered(undefined), false);
  const f = fixture([{activity: 0, value: "np"}, {activity: 1, value: 6}]);
  // 6 alumnes × 10 activitats: només les 6 notes de l'activitat 1 són lliuraments.
  assert.equal(Math.round(deliveryRate(f.course, f.group) * 10) / 10, 10);
});

test("la configuració antiga rep el llindar per defecte (25 %)", () => {
  const course: AcademicCourse = createCourse("2026–2027");
  delete (course.configuration as Partial<typeof course.configuration>).minRaCoverage;
  const db: AppDatabase = {schemaVersion: 1, courses: [course], gradeHistory: []};
  migrateDatabase(db);
  assert.equal(course.configuration.minRaCoverage, 25);
  assert.equal(emptyConfiguration().minRaCoverage, 25);
  void (null as unknown as Group);
});

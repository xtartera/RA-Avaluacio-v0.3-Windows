import assert from "node:assert/strict";
import {test} from "node:test";
import {buildGradesWorkbook, sheetName, workbookFileName} from "../src/controllers/gradesExport.ts";
import {buildServeisCourse} from "../src/model/templates/serveis0227.ts";
import {newEnrollment, newId, nowIso, type AcademicCourse, type Grade} from "../src/model/domain.ts";

function courseWithStudents(): AcademicCourse {
  const course = buildServeisCourse("2026-27");
  const group = course.groups[0];
  for (const name of ["Zamora, Pau", "Abril, Marta", "Casas, Joan"]) {
    const student = {id: newId("student"), name};
    group.students.push(student);
    group.enrollments.push(newEnrollment(student.id, group.id));
  }
  const [a, b] = course.configuration.activities.filter(x => x.session === "ordinaria");
  const grade = (enrollmentId: string, activityId: string, status: Grade["status"], base: number | null, bonus = 0): Grade => ({
    id: newId("grade"), enrollmentId, activityId, status, baseValue: base, updatedAt: nowIso(),
    bonuses: bonus ? [{id: newId("bonus"), value: bonus as 0.5, reason: "Treball extra", source: "manual", createdAt: nowIso()}] : []
  });
  const [e1, e2] = group.enrollments;
  group.grades.push(grade(e1.id, a.id, "graded", 7, 0.5), grade(e2.id, a.id, "not_presented", null), grade(e1.id, b.id, "graded", 4));
  return course;
}

test("el llibre porta resum, un full per unitat, bonificacions i totes les notes", () => {
  const course = courseWithStudents();
  const names = buildGradesWorkbook(course, [course.groups[0]]).map(s => s.name);
  assert.equal(names[0], "Resum");
  assert.ok(names.includes("Bonificacions"));
  assert.equal(names.at(-1), "Totes les notes");
  assert.ok(names.filter(n => n.startsWith("AEA")).length >= 5);
  assert.equal(new Set(names.map(n => n.toLowerCase())).size, names.length);
  assert.ok(names.every(n => n.length <= 31 && !/[[\]:*?/\\]/.test(n)));
});

test("els alumnes surten ordenats i les notes inclouen bonificacions, NP i pendents", () => {
  const course = courseWithStudents();
  const sheets = buildGradesWorkbook(course, [course.groups[0]]);
  const long = sheets.find(s => s.name === "Totes les notes")!;
  const ordinary = course.configuration.activities.filter(a => a.status === "active" && a.session === "ordinaria").length;
  const extra = course.configuration.activities.filter(a => a.status === "active" && a.session === "extraordinaria").length;
  assert.equal(long.rows.length, 1 + 3 * (ordinary + extra));
  const rows = long.rows.slice(1);
  assert.deepEqual([...new Set(rows.map(r => r[1]))], ["Abril, Marta", "Casas, Joan", "Zamora, Pau"]);
  const zamora = rows.filter(r => r[1] === "Zamora, Pau");
  assert.equal(zamora[0][7], "Avaluada");
  assert.equal(zamora[0][8], 7);
  assert.equal(zamora[0][9], 0.5);
  assert.equal(zamora[0][10], 7.5);
  const abril = rows.filter(r => r[1] === "Abril, Marta");
  assert.equal(abril[0][7], "No presentat");
  assert.equal(abril[2][7], "Pendent");
  const unit = sheets.find(s => s.rows.some(r => r[0] === "Zamora, Pau" && r.includes(7.5)));
  assert.ok(unit, "el full de la unitat mostra la nota total (7,5)");
  assert.ok(unit.rows.some(r => r[0] === "Abril, Marta" && r.includes("NP")));
  const bonus = sheets.find(s => s.name === "Bonificacions")!;
  assert.equal(bonus.rows[4][1], "Zamora, Pau");
  assert.equal(bonus.rows[4][3], 0.5);
  assert.equal(bonus.rows[4][4], "Treball extra");
});

test("amb dos grups els fulls porten el grup i el nom de fitxer descriu l'àmbit", () => {
  const course = courseWithStudents();
  const both = buildGradesWorkbook(course, course.groups).map(s => s.name);
  assert.ok(both.some(n => n.startsWith("A · ")) && both.some(n => n.startsWith("B · ")));
  const date = new Date(2026, 10, 20);
  assert.equal(workbookFileName(course, course.groups, date), "notes-SX-2026-27-2026-11-20.xlsx");
  assert.equal(workbookFileName(course, [course.groups[1]], date), "notes-SX-2026-27-grup-B-2026-11-20.xlsx");
});

test("noms de full: s'eliminen caràcters prohibits, es retalla a 31 i es fan únics", () => {
  const used = new Set<string>();
  assert.equal(sheetName("UT1: Instal·lació [A/B]?", used), "UT1 Instal·lació A B");
  assert.equal(sheetName("UT1: Instal·lació [A/B]?", used), "UT1 Instal·lació A B 2");
  assert.equal(sheetName("x".repeat(40), used).length, 31);
  assert.ok(!sheetName("AEA3 Servei d'accés remot (SSH i més)", new Set()).endsWith("("));
});

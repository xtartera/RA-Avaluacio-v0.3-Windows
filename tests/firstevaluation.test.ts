import assert from "node:assert/strict";
import {test} from "node:test";
import JSZip from "jszip";
import {buildJointActaDocx} from "../app/lib/preevaluationDoc.ts";
import {
  buildFirstEvaluation, classifyRaInProgress, firstEvaluationColor, firstEvaluationComment,
  type FirstEvaluationInput, type RaProgress
} from "../src/model/firstEvaluation.ts";
import {buildServeisCourse} from "../src/model/templates/serveis0227.ts";
import {newEnrollment, newId, nowIso, type AcademicCourse, type Grade} from "../src/model/domain.ts";

const ra = (code: string, state: RaProgress["state"], extra: Partial<RaProgress> = {}): RaProgress =>
  ({code, state, score: 7, coverage: 60, needed: null, requiredFailed: false, ...extra});
const input = (ras: RaProgress[], extra: Partial<FirstEvaluationInput> = {}): FirstEvaluationInput =>
  ({coverage: 50, provisional: false, status: "superat", projected: 7.5, minGrade: 5, ras, ...extra});

test("un RA en curs es classifica segons la mitjana que caldria en el que falta", () => {
  assert.equal(classifyRaInProgress(ra("RA1", "en-curs", {needed: -1})), "assegurat");
  assert.equal(classifyRaInProgress(ra("RA1", "en-curs", {needed: 4})), "bon-ritme");
  assert.equal(classifyRaInProgress(ra("RA1", "en-curs", {needed: 7.5})), "esforc");
  assert.equal(classifyRaInProgress(ra("RA1", "en-curs", {needed: 9.6})), "exigent");
  assert.equal(classifyRaInProgress(ra("RA1", "en-curs", {needed: 12})), "impossible");
});

test("semàfor: gris sense dades, verd si va bé, groc si cal esforç, vermell si hi ha un RA no assolit o impossible", () => {
  assert.equal(firstEvaluationColor(input([], {coverage: 0})), "gris");
  assert.equal(firstEvaluationColor(input([ra("RA1", "assolit"), ra("RA2", "en-curs", {needed: 3})])), "verd");
  assert.equal(firstEvaluationColor(input([ra("RA1", "en-curs", {needed: 8})])), "groc");
  assert.equal(firstEvaluationColor(input([ra("RA1", "en-curs", {needed: 3})], {projected: 5.4})), "groc");
  assert.equal(firstEvaluationColor(input([ra("RA1", "no-assolit")], {status: "no-superat", projected: 3})), "vermell");
  assert.equal(firstEvaluationColor(input([ra("RA1", "en-curs", {needed: 11})])), "vermell");
});

test("comentari: parla dels RA assolits, de la nota i del que queda en els RA en curs, i tanca en positiu", () => {
  const text = firstEvaluationComment(input([
    ra("RA1", "assolit"), ra("RA2", "assolit"),
    ra("RA3", "en-curs", {score: 6.4, coverage: 55, needed: 4.2}),
    ra("RA4", "en-curs", {score: 5.6, coverage: 70, needed: 7.5}),
  ]));
  assert.match(text, /Ha assolit els resultats d'aprenentatge RA1 i RA2\./);
  assert.match(text, /RA3 \(nota 6,4, queda un 45 % per avaluar\) va ben encaminat/);
  assert.match(text, /RA4 \(nota 5,6, queda un 30 % per avaluar\): cal una mitjana d'aproximadament un 7,5 en el que queda per assolir-lo; hi ha marge/);
  assert.match(text, /Encara hi ha marge per millorar/, "tanca amb un missatge d'ànim");
  assert.doesNotMatch(text, /suspès|fracàs|desastre/i);
});

test("comentari: RA assegurat, exigent, impossible i no assolit, sempre amb una sortida", () => {
  const text = firstEvaluationComment(input([
    ra("RA1", "en-curs", {needed: -2}),
    ra("RA2", "en-curs", {score: 5, coverage: 90, needed: 9.5}),
    ra("RA3", "en-curs", {needed: 13}),
    ra("RA4", "no-assolit", {requiredFailed: true}),
  ], {status: "no-superat", projected: 4.8}));
  assert.match(text, /RA1 té l'aprovat assegurat/);
  assert.match(text, /és exigent, però encara és possible/);
  assert.match(text, /RA3 no es pot assolir només amb les activitats que queden; convé preparar-ne la recuperació/);
  assert.match(text, /RA4 no s'ha assolit de moment, perquè hi ha una activitat obligatòria pendent de superar, però encara hi ha oportunitats de recuperar-lo/);
  assert.match(text, /Encara hi ha temps per capgirar la situació/);
});

test("comentari: un RA que encara no s'ha començat a avaluar no es dona per encaminat", () => {
  const text = firstEvaluationComment(input([ra("RA1", "assolit"), ra("RA5", "en-curs", {score: null, coverage: 0, needed: null}), ra("RA6", "en-curs", {score: null, coverage: 0, needed: null})]));
  assert.match(text, /RA5 i RA6 encara no s'han començat a avaluar/);
  assert.doesNotMatch(text, /RA5[^.]*ben encaminat/);
});

test("comentari: un RA amb nota actual per sota del mínim no es presenta mai com «ben encaminat»", () => {
  const text = firstEvaluationComment(input([ra("RA2", "en-curs", {score: 3.7, coverage: 27, needed: 5.5, belowMin: true})]));
  assert.doesNotMatch(text, /ben encaminat/);
  assert.match(text, /RA2 \(nota 3,7, queda un 73 % per avaluar\): cal una mitjana d'aproximadament un 5,5/);
});

test("comentari: sense dades només promet seguiment", () => {
  assert.match(firstEvaluationComment(input([], {coverage: 0})), /Encara no hi ha prou activitats avaluades/);
});

function courseWithStudents(): AcademicCourse {
  const course = buildServeisCourse("2026-27");
  const group = course.groups[0];
  const ordinary = course.configuration.activities.filter(a => a.session === "ordinaria");
  for (const a of ordinary) group.activityStates.push({activityId: a.id, automaticEvaluatedAt: null, manualOverride: "evaluated", locked: false});
  const grade = (enrollmentId: string, activityId: string, v: number): Grade => ({id: newId("g"), enrollmentId, activityId, status: "graded", baseValue: v, bonuses: [], updatedAt: nowIso()});
  [["Abril Roca, Marta", 9], ["Zamora Puig, Pau", 3]].forEach(([name, v]) => {
    const student = {id: newId("student"), name: name as string};
    group.students.push(student);
    const e = newEnrollment(student.id, group.id); group.enrollments.push(e);
    for (const a of ordinary) group.grades.push(grade(e.id, a.id, v as number));
  });
  return course;
}

test("buildFirstEvaluation: una fila per alumne amb semàfor i comentari segons els RA", () => {
  const course = courseWithStudents();
  const result = buildFirstEvaluation(course, course.groups[0]);
  assert.deepEqual(result.map(r => r.name), ["ABRIL ROCA, MARTA", "ZAMORA PUIG, PAU"]);
  const [abril, zamora] = result;
  assert.ok(["verd", "groc"].includes(abril.color));
  assert.equal(zamora.color, "vermell");
  assert.ok(abril.comment.length > 40 && zamora.comment.length > 40);
  assert.match(zamora.comment, /RA\d/);
  assert.notEqual(abril.comment, zamora.comment);
});

test("l'acta Word de la 1a avaluació porta el seu títol i l'encapçalament, per a un i per a tots els mòduls", async () => {
  const course = courseWithStudents();
  const zip = await JSZip.loadAsync(await (await buildJointActaDocx("avaluacio1", [course], "A")).arrayBuffer());
  const xml = await zip.file("word/document.xml")!.async("string");
  assert.ok(xml.includes("ACTA DE LA 1a AVALUACIÓ DEL CURS 2026-27"));
  assert.ok(xml.includes("Comentaris de la 1a avaluació:"));
  assert.ok(xml.includes("ABRIL ROCA, MARTA") && xml.includes("ZAMORA PUIG, PAU"));
  assert.ok(!xml.includes("PREAVALUACIÓ"));
});

test("acta de tots els mòduls: el missatge de tancament surt un sol cop per alumne, el del pitjor semàfor", async () => {
  const {buildJointPreevaluation} = await import("../src/model/preevaluation.ts");
  const course = courseWithStudents(), second = courseWithStudents();
  second.id = newId("course"); second.configuration.abbreviation = "SOX";
  const joint = buildJointPreevaluation([course, second], "A", buildFirstEvaluation);
  const zamora = joint.rows.find(r => r.name.startsWith("ZAMORA"))!;
  assert.match(zamora.closing!, /Encara hi ha temps per capgirar la situació/);
  for (const m of zamora.modules) assert.doesNotMatch(m!.comment, /Encara hi ha temps per capgirar/);
  const zip = await JSZip.loadAsync(await (await buildJointActaDocx("avaluacio1", [course, second], "A")).arrayBuffer());
  const xml = await zip.file("word/document.xml")!.async("string");
  assert.equal((xml.match(/Encara hi ha temps per capgirar la situació/g) ?? []).length, 1, "només per a l'alumne en situació vermella");
});

import assert from "node:assert/strict";
import {test} from "node:test";
import JSZip from "jszip";
import {buildJointActaDocx} from "../app/lib/preevaluationDoc.ts";
import type {RaProgress} from "../src/model/firstEvaluation.ts";
import {buildJointPreevaluation} from "../src/model/preevaluation.ts";
import {
  buildSecondEvaluation, secondEvaluationColor, secondEvaluationComment, type SecondEvaluationInput
} from "../src/model/secondEvaluation.ts";
import {buildServeisCourse} from "../src/model/templates/serveis0227.ts";
import {newEnrollment, newId, nowIso, type AcademicCourse, type Grade} from "../src/model/domain.ts";

const ra = (code: string, state: RaProgress["state"], extra: Partial<RaProgress> = {}): RaProgress =>
  ({code, state, score: 7, coverage: 100, needed: null, requiredFailed: false, ...extra});
const input = (ras: RaProgress[], extra: Partial<SecondEvaluationInput> = {}): SecondEvaluationInput =>
  ({coverage: 100, provisional: false, status: "superat", projected: 7.6, minGrade: 5, roundingThreshold: 0.75, ras, ...extra});

test("semàfor de la 2a avaluació: verd supera, groc just o amb RA oberts, vermell no supera, gris sense dades", () => {
  assert.equal(secondEvaluationColor(input([ra("RA1", "assolit"), ra("RA2", "assolit")])), "verd");
  assert.equal(secondEvaluationColor(input([ra("RA1", "assolit")], {projected: 5.4})), "groc");
  assert.equal(secondEvaluationColor(input([ra("RA1", "assolit"), ra("RA2", "en-curs")])), "groc");
  assert.equal(secondEvaluationColor(input([ra("RA1", "no-assolit")], {status: "no-superat", projected: 3})), "vermell");
  assert.equal(secondEvaluationColor(input([], {coverage: 0})), "gris");
});

test("qui supera el mòdul: ho diu amb la nota final arrodonida i felicita", () => {
  const excel = secondEvaluationComment(input([ra("RA1", "assolit"), ra("RA2", "assolit")], {projected: 9.3}));
  assert.match(excel, /Ha superat el mòdul amb una nota excel·lent \(9\), havent assolit tots els resultats d'aprenentatge/);
  assert.match(excel, /Felicitats pel resultat/);
  assert.match(secondEvaluationComment(input([ra("RA1", "assolit")], {projected: 7.8})), /una bona nota \(8\)/);   // 7,8 arrodoneix a 8
  assert.match(secondEvaluationComment(input([ra("RA1", "assolit")], {projected: 5.6})), /una nota justa però suficient \(5\)/);
  assert.match(secondEvaluationComment(input([ra("RA1", "assolit")], {trend: {direction: "puja", delta: 2, recent: 8, previous: 6, n: 8, level: "alt"}})), /progressió positiva al llarg del curs/);
});

test("qui no supera el mòdul: diu quins RA falten i per què, és realista i deixa una sortida", () => {
  const text = secondEvaluationComment(input([
    ra("RA1", "assolit"), ra("RA2", "no-assolit", {requiredFailed: true}), ra("RA3", "no-assolit"),
  ], {status: "no-superat", projected: 4.8}));
  assert.match(text, /No supera el mòdul de moment: els resultats d'aprenentatge RA2 i RA3 no s'han assolit\./);
  assert.match(text, /ha assolit RA1/);
  assert.match(text, /Motius: RA2, per activitats obligatòries pendents de superar; RA3, perquè la nota no arriba al mínim \(5\)\./);
  assert.match(text, /convocatòria extraordinària/);
  assert.match(text, /és possible superar el mòdul/);
  assert.doesNotMatch(text, /fracàs|desastre|perdut/i);
});

test("la gravetat s'adapta: molts RA pendents és complicat; pocs, recuperable; una nota propera ho diu", () => {
  const many = secondEvaluationComment(input([ra("RA1", "no-assolit"), ra("RA2", "no-assolit"), ra("RA3", "assolit")], {status: "no-superat", projected: 3.1}));
  assert.match(many, /situació és complicada/);
  const few = secondEvaluationComment(input([ra("RA1", "no-assolit"), ra("RA2", "assolit"), ra("RA3", "assolit"), ra("RA4", "assolit")], {status: "no-superat", projected: 4.7}));
  assert.match(few, /recuperable amb una dedicació concreta/);
  assert.match(few, /nota global \(4,7\) és propera al mínim/);
  assert.match(secondEvaluationComment(input([ra("RA1", "no-assolit"), ra("RA2", "en-curs")], {status: "no-superat"})), /queda per tancar RA2/);
});

test("amb RA sense tancar no diu que s'ha superat el mòdul: parla de «de moment»", () => {
  const text = secondEvaluationComment(input([ra("RA1", "assolit"), ra("RA2", "en-curs", {coverage: 40})], {coverage: 60, projected: 6.2}));
  assert.match(text, /De moment el mòdul va aprovat \(nota projectada de 6,2\), però encara queda per tancar RA2/);
  assert.doesNotMatch(text, /Ha superat el mòdul/);
});

test("sense dades no inventa un resultat", () => {
  assert.match(secondEvaluationComment(input([], {coverage: 0})), /Encara no hi ha prou activitats avaluades per determinar el resultat/);
});

/** Un mòdul amb totes les activitats avaluades: la Marta ho aprova tot i en Pau no arriba a res. */
function completedCourse(): AcademicCourse {
  const c = buildServeisCourse("2026-27");
  const g = c.groups[0], ord = c.configuration.activities.filter(a => a.session === "ordinaria");
  for (const a of ord) g.activityStates.push({activityId: a.id, automaticEvaluatedAt: null, manualOverride: "evaluated", locked: false});
  for (const [name, v] of [["Abril Roca, Marta", 9], ["Zamora Puig, Pau", 2.5]] as const) {
    const s = {id: newId("s"), name}; g.students.push(s);
    const e = newEnrollment(s.id, g.id); g.enrollments.push(e);
    for (const a of ord) g.grades.push({id: newId("g"), enrollmentId: e.id, activityId: a.id, status: "graded", baseValue: v, bonuses: [], updatedAt: nowIso()} as Grade);
  }
  return c;
}

test("buildSecondEvaluation: amb tot avaluat, qui aprova surt en verd i qui no, en vermell amb els seus RA", () => {
  const course = completedCourse();
  const rows = buildSecondEvaluation(course, course.groups[0]);
  assert.deepEqual(rows.map(r => r.name), ["ABRIL ROCA, MARTA", "ZAMORA PUIG, PAU"]);
  const [abril, zamora] = rows;
  assert.equal(abril.color, "verd"); assert.match(abril.comment, /Ha superat el mòdul/);
  assert.equal(zamora.color, "vermell"); assert.match(zamora.comment, /No supera el mòdul de moment/); assert.match(zamora.comment, /RA\d/);
  assert.ok(zamora.closing && zamora.short && !zamora.short.includes(zamora.closing));
});

test("l'acta Word de la 2a avaluació: títol propi, un sol tancament per alumne a l'acta de tots els mòduls", async () => {
  const first = completedCourse(), second = completedCourse();
  second.id = newId("course"); second.configuration.abbreviation = "SOX";
  const joint = buildJointPreevaluation([first, second], "A", buildSecondEvaluation);
  const pau = joint.rows.find(r => r.name.startsWith("ZAMORA"))!;
  assert.match(pau.closing!, /convocatòria extraordinària/);
  for (const m of pau.modules) assert.doesNotMatch(m!.comment, /convocatòria extraordinària permet recuperar/);
  const zip = await JSZip.loadAsync(await (await buildJointActaDocx("avaluacio2", [first, second], "A")).arrayBuffer());
  const xml = await zip.file("word/document.xml")!.async("string");
  assert.ok(xml.includes("ACTA DE LA 2a AVALUACIÓ DEL CURS 2026-27"));
  assert.ok(xml.includes("Comentaris de la 2a avaluació:"));
  assert.equal((xml.match(/convocatòria extraordinària permet recuperar/g) ?? []).length, 1, "només per a en Pau");
  assert.equal((xml.match(/Felicitats pel resultat/g) ?? []).length, 1, "només per a la Marta");
});

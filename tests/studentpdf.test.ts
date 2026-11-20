import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import JSZip from "jszip";
import {PDFDocument} from "pdf-lib";
import {buildJointStudentPdf, studentEmailLocal, uniquePdfNames, zipPdfs} from "../src/controllers/studentPdf.ts";
import {buildJointStudents} from "../src/model/joint.ts";
import {buildSeguretatCourse} from "../src/model/templates/seguretat0226.ts";
import {buildServeisCourse} from "../src/model/templates/serveis0227.ts";
import {newEnrollment, newId, nowIso, type AcademicCourse} from "../src/model/domain.ts";

test("nom del fitxer: primer nom + primer cognom, sense accents ni símbols", () => {
  assert.equal(studentEmailLocal("Abii , Kelvin Marfo"), "kelvin.abii");
  assert.equal(studentEmailLocal("Aulakh, Amrinder Singh"), "amrinder.aulakh");
  assert.equal(studentEmailLocal("HADDOUCHI BOUDOUH, AYMAN"), "ayman.haddouchi");
  assert.equal(studentEmailLocal("Pérez Núñez, Lluís"), "lluis.perez");
  assert.equal(studentEmailLocal("Çabanes i Vila, Maria-Pau"), "mariapau.cabanes");
  assert.equal(studentEmailLocal("de la Torre Vila, Núria"), "nuria.delatorre");
  assert.equal(studentEmailLocal("Marta Roca"), "marta.roca");
  assert.equal(studentEmailLocal(""), "alumne");
});

test("els noms de fitxer són únics: si es repeteixen, s'hi afegeix -2, -3", () => {
  assert.deepEqual(uniquePdfNames(["ana.puig", "ana.puig.pdf", "joan.roca", "ana.puig"]), ["ana.puig.pdf", "ana.puig-2.pdf", "joan.roca.pdf", "ana.puig-3.pdf"]);
  assert.deepEqual(uniquePdfNames([""]), ["alumne.pdf"]);
});

/** Tres mòduls (SI, SX i un tercer amb 8 RA) amb alumnes a tots; l'Abril només és al primer i al segon. */
function modules(): AcademicCourse[] {
  const first = buildSeguretatCourse("2026-27"), second = buildServeisCourse("2026-27"), third = buildServeisCourse("2026-27");
  second.id = newId("course"); third.id = newId("course");
  first.configuration.abbreviation = "SI"; first.configuration.moduleName = "Seguretat informàtica";
  second.configuration.abbreviation = "SX"; second.configuration.moduleName = "Serveis de xarxa";
  third.configuration.abbreviation = "SOX"; third.configuration.moduleName = "Sistemes Operatius en Xarxa";
  const all = [first, second, third];
  all.forEach((course, ci) => {
    const g = course.groups[0], ord = course.configuration.activities.filter(a => a.session === "ordinaria");
    for (const a of ord.slice(0, 10)) g.activityStates.push({activityId: a.id, automaticEvaluatedAt: null, manualOverride: "evaluated", locked: false});
    for (const n of ["Núñez Çabanes, Lluís", "Abril Roca, Marta"]) {
      if (ci === 2 && n.startsWith("Abril")) continue;
      const s = {id: newId("s"), name: n}; g.students.push(s);
      const e = newEnrollment(s.id, g.id); g.enrollments.push(e);
      ord.slice(0, 10).forEach((a, i) => g.grades.push({id: newId("g"), enrollmentId: e.id, activityId: a.id, status: "graded", baseValue: n.startsWith("Núñez") ? 2 + (i % 3) : 6 + (i % 4), bonuses: [], updatedAt: nowIso()}));
    }
  });
  return all;
}

test("el PDF de l'informe conjunt: resum + una pàgina per mòdul, vàlid i amb els accents", async () => {
  const courses = modules(), students = buildJointStudents(courses, "A");
  const nunez = students.find(s => s.name.startsWith("Núñez"))!;
  const logo = readFileSync(new URL("../public/logo-institut.png", import.meta.url));
  const {bytes, pages, texts} = await buildJointStudentPdf(courses, nunez, courses[0], "A", {logo, now: new Date(2026, 10, 20)});
  assert.equal(new TextDecoder().decode(bytes.subarray(0, 5)), "%PDF-");
  assert.equal(pages, 4, "resum + SI + SX + SOX, cadascun en una sola pàgina");
  assert.equal((await PDFDocument.load(bytes)).getPageCount(), 4);
  const text = texts.join("\n");
  assert.ok(text.includes("INFORME CONJUNT D'AVALUACIÓ DE L'ALUMNE"));
  assert.ok(text.includes("Núñez Çabanes, Lluís"), "el nom amb ñ i ç s'escriu bé");
  assert.ok(text.includes("Seguretat informàtica") && text.includes("Serveis de xarxa") && text.includes("Sistemes Operatius en Xarxa"));
  assert.ok(!/document intern|ús exclusiu/i.test(text), "ja no porta l'avís de document intern");
  assert.ok(text.includes("VALORACIÓ GLOBAL DEL MÒDUL"));
  assert.ok(text.includes("20/11/2026"));
  assert.ok(!text.includes("?"), "cap caràcter s'ha perdut en convertir-lo a la font del PDF");
  assert.ok(bytes.length > 5000 && bytes.length < 400_000, `mida raonable (${bytes.length} bytes)`);
});

test("un alumne que només és a alguns mòduls només en té les pàgines (sense pàgines en blanc)", async () => {
  const courses = modules(), students = buildJointStudents(courses, "A");
  const abril = students.find(s => s.name.startsWith("Abril"))!;
  const {pages, texts} = await buildJointStudentPdf(courses, abril, courses[0], "A");
  assert.equal(pages, 3, "resum + SI + SX");
  assert.ok(texts.join("\n").includes("No matriculat en aquest mòdul"));
});

test("el ZIP porta un PDF per alumne amb el nom indicat", async () => {
  const courses = modules(), students = buildJointStudents(courses, "A");
  const files = [];
  const names = uniquePdfNames(students.map(s => studentEmailLocal(s.name)));
  for (let i = 0; i < students.length; i++) files.push({name: names[i], bytes: (await buildJointStudentPdf(courses, students[i], courses[0], "A")).bytes});
  const zip = await JSZip.loadAsync(await (await zipPdfs(files)).arrayBuffer());
  assert.deepEqual(Object.keys(zip.files).sort(), ["lluis.nunez.pdf", "marta.abril.pdf"]);
  const pdf = await zip.file("marta.abril.pdf")!.async("uint8array");
  assert.equal(new TextDecoder().decode(pdf.subarray(0, 5)), "%PDF-");
});

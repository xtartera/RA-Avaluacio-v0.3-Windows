import assert from "node:assert/strict";
import {test} from "node:test";
import JSZip from "jszip";
import {buildJointPreevaluationDocx, buildPreevaluationDocx} from "../app/lib/preevaluationDoc.ts";
import {buildJointPreevaluation} from "../src/model/preevaluation.ts";
import {buildServeisCourse} from "../src/model/templates/serveis0227.ts";
import {newEnrollment, newId, nowIso, type AcademicCourse, type Grade} from "../src/model/domain.ts";

/** Dos mòduls del mateix curs: l'alumna Abril és als dos, en Zamora només al primer i en Casas només al segon. */
function twoModules(): AcademicCourse[] {
  const first = buildServeisCourse("2026-27"), second = buildServeisCourse("2026-27");
  second.id = newId("course"); second.configuration.abbreviation = "SOX"; second.configuration.moduleName = "Sistemes Operatius en Xarxa";
  const add = (course: AcademicCourse, name: string, grade: number | null) => {
    const group = course.groups[0], student = {id: newId("student"), name};
    group.students.push(student);
    const enrollment = newEnrollment(student.id, group.id);
    group.enrollments.push(enrollment);
    if (grade !== null) for (const a of course.configuration.activities.filter(x => x.session === "ordinaria").slice(0, 4))
      group.grades.push({id: newId("g"), enrollmentId: enrollment.id, activityId: a.id, status: "graded", baseValue: grade, bonuses: [], updatedAt: nowIso()} as Grade);
  };
  for (const course of [first, second]) // les 4 primeres activitats es donen per avaluades, perquè el semàfor tingui dades
    for (const a of course.configuration.activities.filter(x => x.session === "ordinaria").slice(0, 4))
      course.groups[0].activityStates.push({activityId: a.id, automaticEvaluatedAt: null, manualOverride: "evaluated", locked: false});
  add(first, "Abril Roca, Marta", 9); add(second, "Roca Abril, Marta", 3);   // el mateix alumne, amb el nom escrit diferent
  add(first, "Zamora Puig, Pau", 6);
  add(second, "Casas Vidal, Joan", null);
  return [first, second];
}

test("preavaluació conjunta: un alumne amb el semàfor i el comentari de cada mòdul on és, i buit on no", () => {
  const courses = twoModules();
  const joint = buildJointPreevaluation(courses, "A");
  assert.deepEqual(joint.modules.map(m => m.abbreviation), ["SX", "SOX"]);
  assert.deepEqual(joint.rows.map(r => r.name), ["ABRIL ROCA, MARTA", "CASAS VIDAL, JOAN", "ZAMORA PUIG, PAU"].sort((a, b) => a.localeCompare(b, "ca")));
  const byName = (n: string) => joint.rows.find(r => r.name.startsWith(n))!;
  const abril = byName("ABRIL");
  assert.equal(abril.modules.length, 2);
  assert.ok(abril.modules[0] && abril.modules[1], "és als dos mòduls (el nom s'ha unit malgrat l'ordre de cognoms)");
  assert.equal(abril.modules[0]!.color, "verd");        // notes de 9
  assert.equal(abril.modules[1]!.color, "vermell");     // notes de 3
  assert.notEqual(abril.modules[0]!.comment, abril.modules[1]!.comment);
  assert.ok(byName("ZAMORA").modules[0] && byName("ZAMORA").modules[1] === null);
  assert.ok(byName("CASAS").modules[0] === null && byName("CASAS").modules[1]);
});

async function documentXml(blob: Blob): Promise<string> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  return zip.file("word/document.xml")!.async("string");
}

test("l'acta Word conjunta porta tots els mòduls, comentaris amb punt de color i un sol semàfor circular per alumne", async () => {
  const courses = twoModules();
  const blob = await buildJointPreevaluationDocx(courses, "A");
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file("word/document.xml")!.async("string");
  assert.ok(xml.includes("ACTA DE PREAVALUACIÓ"));
  assert.ok(xml.includes("ABRIL ROCA, MARTA") && xml.includes("ZAMORA PUIG, PAU") && xml.includes("CASAS VIDAL, JOAN"));
  assert.ok(xml.includes("Assignatura: SX ") && xml.includes("Assignatura: SOX "), "els professors de cada mòdul");
  assert.ok(xml.includes(" SX: ") && xml.includes(" SOX: "), "cada comentari porta l'abreviatura del mòdul");
  assert.ok(xml.includes("00B050") && xml.includes("FF0000"), "punts de color verd i vermell als comentaris");
  assert.equal((xml.match(/●/g) ?? []).length, 4, "un punt per comentari: abril x2, zamora x1, casas x1");
  assert.equal((xml.match(/<w:drawing>/g) ?? []).length, 3, "un únic semàfor circular per alumne");
  assert.ok(xml.includes("Semàfor: un sol cercle"), "llegenda amb l'ordre dels mòduls");
  const images = Object.keys(zip.files).filter(n => n.startsWith("word/media/") && n.endsWith(".png"));
  assert.ok(images.length >= 1);
});

test("el semàfor circular és un PNG vàlid amb un sector per mòdul, en sentit horari des de dalt", async () => {
  const {trafficPiePng} = await import("../app/lib/trafficPie.ts");
  const zlib = await import("node:zlib");
  const png = trafficPiePng(["00B050", "FFA500", "FF0000"], 120);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const chunks: Record<string, Uint8Array> = {};
  for (let o = 8; o < png.length;) {
    const len = view.getUint32(o), type = String.fromCharCode(...png.subarray(o + 4, o + 8));
    chunks[type] = png.subarray(o + 8, o + 8 + len);
    o += 12 + len;
  }
  assert.equal(new DataView(chunks.IHDR.buffer, chunks.IHDR.byteOffset).getUint32(0), 120);
  const raw = zlib.inflateSync(chunks.IDAT);
  assert.equal(raw.length, 120 * (120 + 1));
  const palette = chunks.PLTE;
  const colorAt = (deg: number) => { // píxel a la meitat del radi, a `deg` graus des de dalt en sentit horari
    const r = 40, rad = deg * Math.PI / 180, x = Math.round(60 + r * Math.sin(rad)), y = Math.round(60 - r * Math.cos(rad));
    const i = raw[y * 121 + 1 + x];
    return [...palette.subarray(i * 3, i * 3 + 3)].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  };
  assert.equal(colorAt(60), "00B050");   // 1r mòdul: de 0° a 120°
  assert.equal(colorAt(180), "FFA500");  // 2n mòdul: de 120° a 240°
  assert.equal(colorAt(300), "FF0000");  // 3r mòdul: de 240° a 360°
  const corner = raw[1];                  // cantonada: fons transparent
  assert.equal(chunks.tRNS[corner], 0);
  assert.equal(trafficPiePng(["00B050"], 60).length > 100, true, "amb un sol mòdul és un cercle complet");
});

test("l'acta d'un sol mòdul continua igual: un semàfor gran i un comentari per alumne", async () => {
  const [course] = twoModules();
  const xml = await documentXml(await buildPreevaluationDocx(course, course.groups[0]));
  assert.ok(xml.includes("ABRIL ROCA, MARTA") && xml.includes("ZAMORA PUIG, PAU"));
  assert.ok(!xml.includes("CASAS VIDAL"), "només els alumnes d'aquest mòdul");
  assert.equal((xml.match(/●/g) ?? []).length, 2);
});

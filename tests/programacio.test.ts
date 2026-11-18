import assert from "node:assert/strict";
import test from "node:test";
import {programContent, programDefaults, programFileName, programValue} from "../src/model/programacio.ts";
import {buildSeguretatCourse} from "../src/model/templates/seguretat0226.ts";

test("la programació de Seguretat informàtica surt de la configuració: RA, CA, matriu, fórmula Qmp i AEA", () => {
  const course = buildSeguretatCourse("2026–2027", ["A"]);
  const c = programContent(course);
  assert.equal(c.ras.length, 5);
  assert.equal(c.ras[0].cas.length, 9);
  assert.equal(c.units.length, 5);
  assert.equal(c.units[0].name, "UD1: Seguretat Passiva");
  assert.deepEqual(c.units[0].ras, ["RA1"]);
  assert.equal(c.units[0].activities.length, 7);
  assert.ok(c.units[0].activities.find(a => a.name === "PE1.1")!.required);
  assert.ok(!c.units[0].activities.find(a => a.name === "A1.2.2")!.required);
  // RA1: la prova escrita pesa un 80 % de l'RA i les activitats sumen 100 %.
  const row = c.matrix[0], pe = c.columns.findIndex(x => x.name === "PE1.1");
  assert.equal(row.cells[pe], 80); assert.ok(Math.abs(row.total - 100) < 0.01);
  // Falta l'RA d'empresa (10 %).
  assert.ok(Math.abs(c.gap - 0.1) < 1e-9);
  assert.match(c.qmp, /0,16·RA1/); assert.match(c.qmp, /0,1·RAemp/);
  assert.deepEqual(c.instruments.map(i => i.name).sort(), ["Apte/No apte", "Pràctica", "Prova escrita"].sort());
});

test("els textos escrits pel professor substitueixen els per defecte i el nom del fitxer segueix la pauta del centre", () => {
  const course = buildSeguretatCourse("2026–2027", ["A"]);
  assert.equal(programValue(course, "assistencia"), programDefaults(course).assistencia);
  course.configuration.programacio = {assistencia: "Text propi", codiModul: "0226"};
  assert.equal(programValue(course, "assistencia"), "Text propi");
  assert.equal(programFileName(course), "PD_CF_SMX_0226_2627");
});

import assert from "node:assert/strict";
import test from "node:test";
import {sequenceHours, parseHours, programSequenceWithHours, programHoursPlan, programSequenceFromActivities, apportion, programUnitDescription, programCodi, programContent, programDefaults, programFileName, programHores, programValue} from "../src/model/programacio.ts";
import {createCourse} from "../src/model/domain.ts";
import {smxModuleOf} from "../src/model/programacioNormativa.ts";
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

test("SI i SOX porten per defecte codi, hores, CPPeS i OG del Decret 193/2013 i de les Orientacions 2024-2026", () => {
  const si = buildSeguretatCourse("2026–2027", ["A"]);
  assert.equal(programCodi(si), "0226");
  assert.deepEqual(programHores(si), {centre: "99", empresa: "33"});
  assert.match(programValue(si, "competencies"), /^a\) Determinar la logística/);
  assert.match(programValue(si, "competencies"), /\np\) Aplicar els protocols i normes de seguretat/);
  assert.doesNotMatch(programValue(si, "competencies"), /\nb\) /);
  assert.match(programValue(si, "objectius"), /\ne\) Situar i fixar/);
  const csi = programContent(si);
  assert.match(csi.ras[2].contingut, /^Identificació digital\. Signatura electrònica/);
  assert.equal(csi.ras.every(r => r.contingut.length > 0), true);
  assert.match(programValue(si, "normativa"), /Decret 193\/2013/);
  const sox = createCourse("2026–2027");
  assert.equal(programCodi(sox), "0224");
  assert.deepEqual(programHores(sox), {centre: "132", empresa: "66"});
  assert.equal(programFileName(sox), `PD_CF_SMX_0224_${sox.academicYear.replace(/\D/g, "").slice(2, 4)}${sox.academicYear.replace(/\D/g, "").slice(6, 8)}`);
  sox.configuration.programacio = {horesCentre: "120"};
  assert.equal(programHores(sox).centre, "120");
  sox.configuration.programacio = {raContinguts: {}};
  const sr = sox.configuration.learningResults;
  assert.equal(programContent(sox).ras.length, sr.filter(r => r.status === "active").length);
});

test("la descripció de cada AEA es genera amb RA, activitats, criteris i continguts", () => {
  const c = programContent(buildSeguretatCourse("2026–2027", ["A"]));
  const d = programUnitDescription(c.units[0], c.ras);
  assert.match(d, /^Aquesta AEA treballa el resultat d'aprenentatge RA1: «Aplica mesures de seguretat passiva/);
  assert.match(d, /7 activitats d'ensenyament-aprenentatge/);
  assert.match(d, /Continguts que es treballen: Ubicació i protecció física dels equips i servidors; Sistemes d'alimentació ininterrompuda\./);
  assert.doesNotMatch(d, /pendent/);
});

test("els textos escrits pel professor substitueixen els per defecte i el nom del fitxer segueix la pauta del centre", () => {
  const course = buildSeguretatCourse("2026–2027", ["A"]);
  assert.equal(programValue(course, "assistencia"), programDefaults(course).assistencia);
  course.configuration.programacio = {assistencia: "Text propi", codiModul: "0226"};
  assert.equal(programValue(course, "assistencia"), "Text propi");
  assert.equal(programFileName(course), "PD_CF_SMX_0226_2627");
});

test("el repartiment d'hores quadra amb el mòdul: examen 2 h, la resta sessions senceres", () => {
  const si = buildSeguretatCourse("2026–2027", ["A"]);
  const c = programContent(si), plan = programHoursPlan(si, c);
  assert.equal(plan.moduleTotal, 99);
  assert.equal(plan.assigned, 99);
  assert.deepEqual(plan.warnings, []);
  for (const u of c.units) {
    const total = u.activities.reduce((s, a) => s + plan.activity[a.id], 0);
    assert.equal(total, plan.unit[u.id]);
    for (const a of u.activities) { assert.ok(Number.isInteger(plan.activity[a.id]) && plan.activity[a.id] >= 1); if (/prova/i.test(a.type)) assert.ok(plan.activity[a.id] >= 2); }
  }
  assert.equal(c.units.reduce((s, u) => s + plan.unit[u.id], 0), 99);
  // Hores fixades pel professor: l'AEA i una activitat es respecten i la resta es reparteix.
  const u0 = c.units[0], first = u0.activities[0];
  si.configuration.programacio = {units: {[u0.id]: {hores: "20", activityHours: {[first.id]: 5}}}};
  const p2 = programHoursPlan(si, c);
  assert.equal(p2.unit[u0.id], 20); assert.equal(p2.activity[first.id], 5);
  assert.equal(u0.activities.reduce((s, a) => s + p2.activity[a.id], 0), 20);
  assert.equal(p2.assigned, 99);
  assert.equal(programSequenceFromActivities(u0, p2)[0].temps, "5 h");
  assert.deepEqual(apportion(10, [1, 1, 1]), [4, 3, 3]);
});

test("una seqüència desada amb la temporització en blanc rep les hores del repartiment", () => {
  const si = buildSeguretatCourse("2026–2027", ["A"]), c = programContent(si), plan = programHoursPlan(si, c), u = c.units[0];
  const old = u.activities.map(a => ({text: `${a.type}: ${a.name}`, organitzacio: "Individual", temps: "", metodologia: "x", recursos: "y", localitzacio: "Aula"}));
  old.unshift({text: "Presentació de l'AEA", organitzacio: "Individual", temps: "30 min", metodologia: "x", recursos: "y", localitzacio: "Aula"});
  const out = programSequenceWithHours(old, u, plan);
  assert.equal(out.length, old.length - 1);
  assert.equal(out[0].temps, `${plan.activity[u.activities[0].id]} h`);
  assert.ok(out.every(r => /^\d+ h$/.test(r.temps)));
  assert.equal(sequenceHours(out), plan.unit[u.id]);
  assert.equal(sequenceHours(old), plan.unit[u.id] - 0 + 0.5 - u.activities.reduce((s, a) => s + plan.activity[a.id], 0) + 0);
  assert.equal(parseHours("1,5 h"), 1.5); assert.equal(parseHours("30 min"), 0.5);
});

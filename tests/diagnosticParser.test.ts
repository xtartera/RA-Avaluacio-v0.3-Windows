import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {matchStudent, parseDiagnosticPdf, parseMinutes, type PdfItem} from "../src/controllers/diagnosticParser.ts";

const pages = JSON.parse(readFileSync(new URL("./fixtures/diagnostic-ut1-items.json", import.meta.url), "utf8")) as PdfItem[][];
const parsed = parseDiagnosticPdf(pages);

test("llegeix la capçalera i el resum", () => {
  assert.equal(parsed.title, "Avaluació inicial UT1 – Windows Server i Active Directory");
  assert.equal(parsed.unit, 1);
  assert.equal(parsed.firstName, "ALUMNE");
  assert.equal(parsed.lastName, "PROVA");
  assert.equal(parsed.submittedAt, "2026-10-12T10:50");
  assert.equal(parsed.score, 8);
  assert.deepEqual([parsed.correct, parsed.total], [16, 20]);
  assert.deepEqual(parsed.blocks.map(b => b.pct), [100, 75, 100, 50, 75]);
  assert.equal(parsed.blocks[3].title, "Polítiques de grup i seguretat");
  assert.deepEqual(parsed.warnings, []);
});

test("llegeix totes les preguntes amb la resposta de l'alumne", () => {
  assert.equal(parsed.questions.length, 20);
  const q = (n: number) => parsed.questions.find(x => x.number === n)!;
  assert.deepEqual([q(1).correct, q(1).answer], [true, ["Un ordinador simulat per programari que funciona dins d’un altre ordinador"]]);
  assert.deepEqual([q(5).correct, q(5).answer], [false, ["Perquè les adreces fixes són més ràpides"]]);
  assert.equal(q(5).options.length, 4);
  assert.deepEqual([q(7).kind, q(7).answer, q(7).correct], ["text", ["ipconfig"], true]);
  assert.deepEqual([q(14).kind, q(14).answer, q(14).correct], ["text", ["updategpo"], false]);
  assert.deepEqual([q(16).correct, q(16).answer], [false, ["Que combini majúscules, minúscules, xifres i símbols"]]);
  assert.equal(q(17).text, "Una carpeta compartida té permisos de compartició i permisos NTFS. Quan un usuari hi accedeix per la xarxa, quins s’apliquen?");
  assert.deepEqual(q(20).answer, ["http://SERVIDOR/Dades"]);
  assert.equal(parsed.questions.filter(x => !x.correct).length, 4);
  assert.ok(parsed.questions.every(x => !x.unknown));
});

test("llegeix temps i integritat", () => {
  assert.deepEqual([parsed.activeMinutes, parsed.estimatedMinutes, parsed.sessions], [4, 9, 1]);
  assert.equal(parsed.integrity, "Dossier verificat");
  assert.equal(parsed.fingerprint, "AVALUACIO-INICIAL-UT1-S2-BD514421F9942E9F");
  assert.equal(parsed.blocks[0].minutes, 1);
  assert.equal(parsed.blocks[3].minutes, 0.5);
});

test("rebutja un PDF que no és el qüestionari", () => {
  assert.throws(() => parseDiagnosticPdf([[{s: "Factura", f: "f1", x: 0, y: 0}]]), /no sembla un qüestionari/);
});

test("detecta el «No ho sé» marcat", () => {
  const modified = structuredClone(pages);
  // Pregunta 1 (pàgina 4): només «No ho sé» en negreta.
  const page = modified[3];
  const bold = page.find(i => i.s === "Pregunta 1")!.f, regular = page.find(i => i.s === "Què és una màquina virtual?")!.f;
  page.find(i => i.s.startsWith("Un ordinador simulat"))!.f = regular;
  page.find(i => i.s === "No ho sé")!.f = bold;
  page.find(i => i.s === "Correcta")!.s = "Sense resposta";
  const p = parseDiagnosticPdf(modified);
  assert.equal(p.questions[0].unknown, true);
  assert.equal(p.questions[0].correct, false);
  assert.deepEqual(p.questions[0].answer, []);
  assert.ok(p.warnings.some(w => /Bloc 1/.test(w)), "el resum del PDF ja no coincideix amb el detall");
});

test("relaciona el nom del PDF amb el llistat", () => {
  const people = [{enrollmentId: "a", name: "Agramunt Pujol, Xavier"}, {enrollmentId: "b", name: "Aquino, Mateo Emiliano"}, {enrollmentId: "c", name: "Abii , Kelvin Marfo"}];
  assert.deepEqual(matchStudent(people, "XAVIER", "AGRAMUNT"), {enrollmentId: "a", exact: false, fuzzy: false});
  assert.deepEqual(matchStudent(people, "Kelvin Marfo", "Abii"), {enrollmentId: "c", exact: true, fuzzy: false});
  assert.equal(matchStudent(people, "Laura", "Soler"), null);
});

test("parseMinutes", () => {
  assert.equal(parseMinutes("0 h 04 min"), 4);
  assert.equal(parseMinutes("1 h 20 min"), 80);
  assert.equal(parseMinutes("< 1 min"), 0.5);
  assert.equal(parseMinutes(undefined), null);
});

const ut2 = parseDiagnosticPdf(JSON.parse(readFileSync(new URL("./fixtures/diagnostic-ut2-items.json", import.meta.url), "utf8")) as PdfItem[][]);

test("UT2: llegeix un altre quadern (títol, blocs, nota)", () => {
  assert.equal(ut2.title, "Avaluació inicial UT2 – Linux, LDAP i perfils mòbils");
  assert.equal(ut2.unit, 2);
  assert.equal(ut2.score, 4);
  assert.deepEqual([ut2.correct, ut2.total], [8, 20]);
  assert.deepEqual(ut2.blocks.map(b => b.title), ["Linux i terminal", "Xarxa del servidor", "Directori LDAP", "Autenticació centralitzada", "NFS i perfils mòbils"]);
  assert.deepEqual(ut2.blocks.map(b => b.pct), [50, 25, 50, 50, 25]);
  assert.deepEqual(ut2.warnings, []);
  assert.equal(ut2.questions.length, 20);
});

test("UT2: «No ho sé» sense ✔/✖ (línia «— No ho sé») no embruta la resposta ni arrossega el peu de pàgina", () => {
  const q7 = ut2.questions.find(q => q.number === 7)!, q16 = ut2.questions.find(q => q.number === 16)!;
  assert.deepEqual([q7.kind, q7.unknown, q7.correct, q7.answer], ["text", true, false, []]);
  assert.deepEqual([q16.kind, q16.unknown, q16.correct, q16.answer, q16.options.length], ["choice", true, false, [], 4]);
  assert.equal(ut2.questions.filter(q => q.unknown).length, 2);
  assert.ok(ut2.questions.every(q => q.options.every(o => !/Qüestionari de correcció|https:/.test(o))));
});

test("PDF desat amb un altre nom: la capçalera porta el nom del fitxer i el títol i la UT es llegeixen de la portada", () => {
  const renamed = structuredClone(pages);
  for (const page of renamed) for (const item of page) if (item.s.startsWith("Qüestionari de correcció automàtica ·")) item.s = "AV_Inicial_UT1_Alumne_Prova";
  const p = parseDiagnosticPdf(renamed);
  assert.equal(p.title, "Avaluació inicial UT1 – Windows Server i Active Directory");
  assert.equal(p.unit, 1);
  assert.equal(p.score, 8);
  assert.deepEqual(p.warnings, []);
});

test("la UT també es pot treure de l'empremta del dossier", () => {
  const renamed = structuredClone(pages);
  for (const page of renamed) for (const item of page) {
    if (item.s.startsWith("Qüestionari de correcció automàtica ·")) item.s = "fitxer";
    if (item.s === "Avaluació inicial UT1 – Windows Server i") item.s = "Dossier d'entrada –";
  }
  assert.equal(parseDiagnosticPdf(renamed).unit, 1);
});

test("un PDF sense text (imatge) dona un missatge clar", () => {
  assert.throws(() => parseDiagnosticPdf([[], [], []]), /no té text: és una imatge/);
});

test("el nom amb una errada d'escriptura es proposa però es marca com a aproximat", () => {
  const people = [{enrollmentId: "a", name: "Akrikiz, Nasreddine"}, {enrollmentId: "b", name: "Amjahed, Adam"}, {enrollmentId: "c", name: "Singh Kaur, Tarunjot"}];
  assert.deepEqual(matchStudent(people, "Nasreddine", "Akrikez"), {enrollmentId: "a", exact: false, fuzzy: true});
  assert.deepEqual(matchStudent(people, "Tarunjot", "Singh"), {enrollmentId: "c", exact: false, fuzzy: false});
  assert.equal(matchStudent(people, "Adam", "Amj"), null); // massa curt per assumir-ho
  assert.deepEqual(matchStudent(people, "adam", "AMJAHED"), {enrollmentId: "b", exact: true, fuzzy: false});
});

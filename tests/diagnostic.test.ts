import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {parseDiagnosticPdf, type PdfItem} from "../src/controllers/diagnosticParser.ts";
import {blockStatus, compareDiagnostics, concludeDiagnostic, diagnosticLevel, givenName, summarizeGroupDiagnostic, unitTopic} from "../src/model/diagnostic.ts";
import type {DiagnosticResult} from "../src/model/domain.ts";

const pages = JSON.parse(readFileSync(new URL("./fixtures/diagnostic-ut1-items.json", import.meta.url), "utf8")) as PdfItem[][];
const parsed = parseDiagnosticPdf(pages);

function resultFor(id: string, overrides: Partial<DiagnosticResult> = {}): DiagnosticResult {
  return {
    id, activityId: "act-1", enrollmentId: `e-${id}`, title: parsed.title, unit: parsed.unit, deliveryNumber: 1,
    score: parsed.score, correct: parsed.correct, total: parsed.total, blocks: structuredClone(parsed.blocks), questions: structuredClone(parsed.questions),
    activeMinutes: parsed.activeMinutes, estimatedMinutes: parsed.estimatedMinutes, sessions: 1, integrity: parsed.integrity, fingerprint: id,
    submittedAt: parsed.submittedAt, warnings: [], fileName: "x.pdf", attachmentId: null, importedAt: "2026-10-12T10:00:00.000Z", ...overrides,
  };
}

test("franges de nivell i de bloc", () => {
  assert.deepEqual([9, 8, 7.9, 6, 5.9, 4, 3.9].map(diagnosticLevel), ["alt", "alt", "adequat", "adequat", "en-proces", "en-proces", "suport"]);
  assert.deepEqual([100, 85, 75, 60, 50, 40, 25].map(blockStatus), ["domina", "domina", "correcte", "correcte", "reforcar", "reforcar", "prioritari"]);
});

test("noms", () => {
  assert.equal(givenName("Abii , Kelvin Marfo"), "Kelvin Marfo");
  assert.equal(givenName("Xavier"), "Xavier");
  assert.equal(unitTopic("Avaluació inicial UT1 – Windows Server i Active Directory"), "Windows Server i Active Directory");
});

test("conclusions del cas real: fort a virtualització i AD, reforç a polítiques", () => {
  const c = concludeDiagnostic(resultFor("a"), [], "Agramunt, Xavier");
  assert.equal(c.level, "alt");
  assert.deepEqual(c.strong.map(b => b.number), [1, 3]);
  assert.deepEqual(c.middle.map(b => b.number), [2, 5]);
  assert.deepEqual(c.weak.map(b => b.number), [4]);
  assert.match(c.headline, /^Xavier ha obtingut un 8,0 sobre 10 \(16 de 20 preguntes\)/);
  assert.match(c.text, /Mostra un bon domini dels blocs «Instal·lació i virtualització» \(100 %\) i «Active Directory» \(100 %\)/);
  assert.match(c.text, /Cal reforçar el bloc «Polítiques de grup i seguretat» \(50 %\)/);
  assert.match(c.text, /va escriure «updategpo»/);
  assert.match(c.text, /de la UT1 \(Windows Server i Active Directory\)/);
  assert.doesNotMatch(c.text, /Escriu només/);
  assert.doesNotMatch(c.text, /l'…/);
  assert.match(c.text, /No ha fet servir l'opció «No ho sé»/);
  // Les errades del bloc a reforçar surten primer.
  assert.deepEqual(c.misses.map(m => m.question.number).slice(0, 2), [14, 16]);
  assert.deepEqual(c.actions, ["Reforçar «Polítiques de grup i seguretat» en començar la UT1."]);
});

test("avisa d'un ritme molt ràpid i compara amb el grup", () => {
  const peers = [resultFor("b", {score: 5}), resultFor("c", {score: 6}), resultFor("d", {score: 7})];
  const c = concludeDiagnostic(resultFor("a"), peers, "Agramunt, Xavier");
  assert.ok(c.cautions.some(x => /Ritme molt ràpid: 4 min/.test(x)));
  assert.match(c.text, /superior a la mitjana del grup \(6,0\)/);
  const slow = concludeDiagnostic(resultFor("a", {activeMinutes: 25}), [], "Xavier");
  assert.deepEqual(slow.cautions, []);
});

test("«No ho sé» s'explica a part", () => {
  const r = resultFor("a");
  r.questions[13].unknown = true; r.questions[13].answer = [];
  const c = concludeDiagnostic(r, [], "Xavier");
  assert.match(c.text, /Ha reconegut que no sabia respondre 1 pregunta/);
  assert.doesNotMatch(c.text, /No ha fet servir/);
});

test("resum del grup: blocs i preguntes més fallades", () => {
  const results = ["a", "b", "c"].map(id => resultFor(id));
  results[1].questions.find(q => q.number === 1)!.correct = false; results[1].questions.find(q => q.number === 1)!.answer = ["Un programa antivirus"];
  results[2].questions.find(q => q.number === 1)!.correct = false; results[2].questions.find(q => q.number === 1)!.answer = ["Un programa antivirus"];
  const s = summarizeGroupDiagnostic(results);
  assert.equal(s.count, 3);
  assert.equal(s.averageScore, 8);
  assert.equal(s.levels.alt, 3);
  assert.equal(s.blocks[3].averagePct, 50);
  // Les 4 preguntes errades de l'alumne real (5, 14, 16, 20) fallen en tots tres; P1 en 2 de 3.
  assert.deepEqual(s.hardest.map(h => h.question.number), [5, 14, 16, 20, 1]);
  assert.equal(s.hardest[0].failPct, 100);
  assert.deepEqual(s.hardest[0].commonWrong, {answer: "Perquè les adreces fixes són més ràpides", count: 3});
  assert.deepEqual(s.hardest[4].commonWrong, {answer: "Un programa antivirus", count: 2});
});

test("comparació entre UT: millora, nivell i punts forts i febles de cada UT", () => {
  const ut1 = resultFor("a");
  const ut2 = resultFor("b", {activityId: "act-2", unit: 2, title: "Avaluació inicial UT2 – Linux, LDAP i perfils mòbils", score: 9, correct: 18, activeMinutes: 14,
    blocks: [{number: 1, title: "Linux i terminal", correct: 4, wrong: 0, unknown: 0, total: 4, pct: 100, minutes: 3}, {number: 2, title: "Xarxa del servidor", correct: 3, wrong: 1, unknown: 0, total: 4, pct: 75, minutes: 3}]});
  const c = compareDiagnostics([ut2, ut1], "Agramunt, Xavier", []);
  assert.deepEqual(c.rows.map(r => r.label), ["UT1", "UT2"]);
  assert.equal(c.delta, 1);
  assert.match(c.text, /Xavier ha obtingut 8,0 a la UT1 i 9,0 a la UT2: millora 1,0 punts entre la UT1 i la UT2\./);
  assert.match(c.text, /UT1: punt fort «Instal·lació i virtualització» \(100 %\), a reforçar «Polítiques de grup i seguretat» \(50 %\)\./);
  assert.match(c.text, /UT2: punt fort «Linux i terminal» \(100 %\)\./);
  assert.doesNotMatch(c.text, /Pendent/);
});

test("comparació amb una sola UT: indica què falta", () => {
  const c = compareDiagnostics([resultFor("a")], "Xavier", ["Avaluació inicial UT2"]);
  assert.equal(c.delta, null);
  assert.match(c.text, /té l'avaluació inicial de la UT1 \(8,0 sobre 10, nivell alt\)/);
  assert.match(c.text, /Pendent d'importar: Avaluació inicial UT2\./);
  const down = compareDiagnostics([resultFor("a"), resultFor("b", {unit: 2, score: 6})], "Xavier");
  assert.match(down.text, /baixa 2,0 punts/);
  assert.match(down.text, /passa de alt a adequat/);
  assert.match(compareDiagnostics([resultFor("a"), resultFor("b", {unit: 2, score: 8.2})], "Xavier").text, /es manté estable/);
});

test("diversos blocs febles donen una sola acció", () => {
  const r = resultFor("a");
  r.blocks = r.blocks.map(b => ({...b, pct: 25}));
  const c = concludeDiagnostic(r, [], "Xavier");
  assert.equal(c.actions.length, 1);
  assert.match(c.actions[0], /^Reforçar els blocs «Instal·lació i virtualització», «Xarxa», «Active Directory», «Polítiques de grup i seguretat» i «Recursos compartits, permisos i perfils» en començar la UT1\.$/);
});

import assert from "node:assert/strict";
import test from "node:test";
import {applyObservationRows, buildObservationCsv, parseObservationCsv} from "../src/controllers/observationCsv.ts";
import {emptyGroup} from "../src/model/domain.ts";

const people = [{enrollmentId: "e1", name: "Akrikiz, Nasreddine"}, {enrollmentId: "e2", name: "Castaño Devesa, Aleix"}, {enrollmentId: "e3", name: "HUESCAR CABANAS, DÍDAC"}];

test("llegeix un CSV amb «;», valors buits, factors i nota", () => {
  const csv = "alumne;autonomia;entorn;errors;organitzacio;implicacio;comunicacio;factors;nota\r\n\"Akrikiz, Nasreddine\";4;3;;2;4;1;Llengua|ritme;Nouvingut\r\nCastaño Devesa, Aleix;2;;;;3;;;\r\n";
  const {rows, warnings} = parseObservationCsv(csv);
  assert.deepEqual(warnings, []);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {name: "Akrikiz, Nasreddine", levels: {autonomia: 4, entorn: 3, organitzacio: 2, implicacio: 4, comunicacio: 1}, factors: ["llengua", "ritme"], note: "Nouvingut"});
  assert.deepEqual(rows[1].levels, {autonomia: 2, implicacio: 3});
});

test("també accepta «,» (amb els noms entre cometes) i avisa de valors o factors invàlids", () => {
  const csv = "Alumne,Autonomia,Comunicació,Factors\n\"Akrikiz, Nasreddine\",5,x,\"expressió oral|altre|alienígena\"\n";
  const {rows, warnings} = parseObservationCsv(csv);
  assert.deepEqual(rows[0].levels, {});
  assert.deepEqual(rows[0].factors, ["oral", "altres"]);
  assert.ok(warnings.some(w => /«5»/.test(w)) && warnings.some(w => /alienigena/.test(w)));
});

test("rebutja fitxers sense capçalera «alumne» o sense alumnes", () => {
  assert.throws(() => parseObservationCsv("nom_complet;autonomia\nA;1"), /columna «alumne»/);
  assert.throws(() => parseObservationCsv("alumne;autonomia\n"), /cap alumne/);
  assert.throws(() => parseObservationCsv(""), /buit/);
});

test("aplica per nom, substitueix el que hi ha i informa dels que no troba", () => {
  const group = emptyGroup("B");
  group.observations.push({enrollmentId: "e2", levels: {autonomia: 1}, factors: [], updatedAt: "x"});
  const {rows} = parseObservationCsv("alumne;autonomia;implicacio\nAkrikiz, Nasreddine;4;3\nAleix Castaño Devesa;3;\nDídac Huescar Cabanas;;2\nLaura Soler;2;2\n");
  const r = applyObservationRows(group, people, rows);
  assert.deepEqual([r.applied, r.replaced, r.unmatched], [3, 1, ["Laura Soler"]]);
  assert.equal(group.observations.length, 3);
  assert.deepEqual(group.observations.find(o => o.enrollmentId === "e2")!.levels, {autonomia: 3});
});

test("exporta i es pot tornar a importar sense perdre res", () => {
  const group = emptyGroup("B");
  group.observations.push({enrollmentId: "e1", levels: {autonomia: 4, comunicacio: 1}, factors: ["llengua"], note: "Nota; amb punt i coma", updatedAt: "x"});
  const csv = buildObservationCsv(people, group.observations);
  assert.match(csv, /^alumne;autonomia;entorn;errors;organitzacio;implicacio;comunicacio;factors;nota\r\n/);
  const back = emptyGroup("B");
  const {rows} = parseObservationCsv(csv);
  applyObservationRows(back, people, rows);
  assert.deepEqual(back.observations.map(o => ({levels: o.levels, factors: o.factors, note: o.note})), [{levels: {autonomia: 4, comunicacio: 1}, factors: ["llengua"], note: "Nota; amb punt i coma"}]);
});

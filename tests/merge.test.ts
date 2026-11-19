import assert from "node:assert/strict";
import {test} from "node:test";
import {deepEqual, mergeDatabases} from "../src/model/mergeDatabases.ts";
import type {AcademicCourse, AppDatabase} from "../src/model/domain.ts";

const course = (id: string, mark = ""): AcademicCourse => ({
  id, academicYear: "2026-27", active: true, archived: false, isTest: false, groups: [], imports: [],
  createdAt: "x", updatedAt: "x", configuration: {name: id, abbreviation: id, mark}
} as unknown as AcademicCourse);
const database = (courses: AcademicCourse[], history: string[] = []): AppDatabase => ({
  schemaVersion: 1, courses,
  gradeHistory: history.map(id => ({id, gradeId: "g", at: "t", action: "a", previous: null, next: null}))
});
const ids = (d: AppDatabase) => d.courses.map(c => c.id);
const mark = (d: AppDatabase, id: string) => (d.courses.find(c => c.id === id)!.configuration as unknown as {mark: string}).mark;

test("cursos tocats per bandes diferents es combinen sense conflicte", () => {
  const base = database([course("SOX"), course("SX")]);
  const mine = database([course("SOX", "meu"), course("SX")]);
  const theirs = database([course("SOX"), course("SX", "seu")]);
  const r = mergeDatabases(base, mine, theirs);
  assert.equal(r.conflicts.length, 0);
  assert.equal(mark(r.merged, "SOX"), "meu");
  assert.equal(mark(r.merged, "SX"), "seu");
  assert.deepEqual(r.fromTheirs.map(c => c.id), ["SX"]);
});

test("el mateix curs tocat per les dues bandes és conflicte", () => {
  const base = database([course("SOX")]);
  const r = mergeDatabases(base, database([course("SOX", "a")]), database([course("SOX", "b")]));
  assert.deepEqual(r.conflicts.map(c => c.id), ["SOX"]);
});

test("els dos fan el mateix canvi: no és conflicte", () => {
  const base = database([course("SOX")]);
  const r = mergeDatabases(base, database([course("SOX", "a")]), database([course("SOX", "a")]));
  assert.equal(r.conflicts.length, 0);
  assert.equal(mark(r.merged, "SOX"), "a");
});

test("cursos nous creats per cadascú s'afegeixen tots dos", () => {
  const base = database([course("SOX")]);
  const r = mergeDatabases(base, database([course("SOX"), course("SI")]), database([course("SOX"), course("SX")]));
  assert.equal(r.conflicts.length, 0);
  assert.deepEqual(ids(r.merged).sort(), ["SI", "SOX", "SX"]);
  assert.deepEqual(r.fromTheirs.map(c => c.id), ["SX"]);
});

test("curs esborrat per un i no tocat per l'altre s'esborra; si l'altre l'ha canviat, és conflicte", () => {
  const base = database([course("SOX"), course("SX")]);
  const esborratPerEll = mergeDatabases(base, database([course("SOX"), course("SX")]), database([course("SOX")]));
  assert.deepEqual(ids(esborratPerEll.merged), ["SOX"]);
  assert.equal(esborratPerEll.conflicts.length, 0);
  const esborratPerMi = mergeDatabases(base, database([course("SOX")]), database([course("SOX"), course("SX")]));
  assert.deepEqual(ids(esborratPerMi.merged), ["SOX"]);
  const canviatIEsborrat = mergeDatabases(base, database([course("SOX"), course("SX", "meu")]), database([course("SOX")]));
  assert.deepEqual(canviatIEsborrat.conflicts.map(c => c.id), ["SX"]);
});

test("sense canvis meus, el resultat és exactament el del fitxer", () => {
  const base = database([course("SOX"), course("SX")]);
  const theirs = database([course("SOX", "x"), course("SX", "y"), course("SI")]);
  const r = mergeDatabases(base, base, theirs);
  assert.equal(r.conflicts.length, 0);
  assert.ok(deepEqual(r.merged, theirs));
});

test("l'historial de notes es fusiona com a conjunt: afegits de totes dues bandes, esborrats respectats", () => {
  const base = database([], ["h1", "h2"]);
  const mine = database([], ["h1", "h2", "h3"]);
  const theirs = database([], ["h2", "h4"]); // ells han esborrat h1 i afegit h4
  const r = mergeDatabases(base, mine, theirs);
  assert.deepEqual(r.merged.gradeHistory.map(h => h.id).sort(), ["h2", "h3", "h4"]);
});

test("deepEqual no depèn de l'ordre de les claus", () => {
  assert.ok(deepEqual({a: 1, b: [1, {c: 2, d: 3}]}, {b: [1, {d: 3, c: 2}], a: 1}));
  assert.ok(!deepEqual({a: 1}, {a: 2}));
  assert.ok(!deepEqual([1, 2], [2, 1]));
});

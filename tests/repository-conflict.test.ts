import assert from "node:assert/strict";
import {test} from "node:test";
import {
  BACKUPS_TO_KEEP, ExternalChangeError, FileBackedRepository, backupFileName, backupsToDelete,
  type AppRepository
} from "../src/model/repository.ts";
import type {AppDatabase} from "../src/model/domain.ts";

const db = (n: number): AppDatabase => ({schemaVersion: 1, courses: [], gradeHistory: [{n}]} as unknown as AppDatabase);

/** Fitxer simulat: contingut i data de modificació controlables des de la prova. */
function fakeFile(initial: string) {
  const state = {text: initial, modified: 1};
  const handle = {
    name: "ra-avaluacio.json",
    queryPermission: async () => "granted",
    getFile: async () => ({text: async () => state.text, lastModified: state.modified, size: state.text.length}),
    createWritable: async () => {
      let buffer = "";
      return {write: async (t: string) => { buffer += t; }, close: async () => { state.text = buffer; state.modified += 1; }};
    }
  };
  return {state, handle: handle as unknown as FileSystemFileHandle};
}

const memoryCache = (): AppRepository => {
  let saved: AppDatabase | null = null;
  return {load: async () => saved ?? db(0), save: async d => { saved = d; }, clear: async () => { saved = null; }};
};

async function connected(initial: object) {
  const file = fakeFile(JSON.stringify(initial));
  const repo = new FileBackedRepository(memoryCache());
  repo.useHandle(file.handle);
  await repo.load();
  return {file, repo};
}

test("desa amb normalitat quan ningú més ha tocat el fitxer", async () => {
  const {file, repo} = await connected(db(1));
  await repo.save(db(2));
  await repo.save(db(3));
  assert.equal(JSON.parse(file.state.text).gradeHistory[0].n, 3);
  assert.equal(repo.hasConflict(), false);
});

test("no sobreescriu si un altre ha canviat el fitxer", async () => {
  const {file, repo} = await connected(db(1));
  file.state.text = JSON.stringify(db(99)); file.state.modified += 1; // un company desa des d'un altre ordinador
  await assert.rejects(repo.save(db(2)), ExternalChangeError);
  assert.equal(JSON.parse(file.state.text).gradeHistory[0].n, 99);
  assert.equal(repo.hasConflict(), true);
  // mentre hi ha conflicte, els següents desaments també s'aturen
  await assert.rejects(repo.save(db(3)), ExternalChangeError);
  assert.equal(JSON.parse(file.state.text).gradeHistory[0].n, 99);
});

test("només canvia la data (sincronització del Drive) i el contingut és el mateix: no és conflicte", async () => {
  const {file, repo} = await connected(db(1));
  file.state.modified += 5;
  await repo.save(db(2));
  assert.equal(JSON.parse(file.state.text).gradeHistory[0].n, 2);
});

test("resoldre amb «la seva versió» carrega el fitxer i permet continuar desant", async () => {
  const {file, repo} = await connected(db(1));
  file.state.text = JSON.stringify(db(99)); file.state.modified += 1;
  await assert.rejects(repo.save(db(2)), ExternalChangeError);
  const theirs = await repo.resolveTakeTheirs();
  assert.equal((theirs.gradeHistory[0] as unknown as {n: number}).n, 99);
  assert.equal(repo.hasConflict(), false);
  await repo.save(db(100));
  assert.equal(JSON.parse(file.state.text).gradeHistory[0].n, 100);
});

test("resoldre amb «la meva versió» sobreescriu el fitxer després de fer-ne còpia", async () => {
  const {file, repo} = await connected(db(1));
  file.state.text = JSON.stringify(db(99)); file.state.modified += 1;
  await assert.rejects(repo.save(db(2)), ExternalChangeError);
  let backed = "";
  (repo as unknown as {backupText: (t: string) => Promise<string>}).backupText = async t => { backed = t; return "còpia"; };
  await repo.resolveKeepMine(db(2));
  assert.equal(JSON.parse(backed).gradeHistory[0].n, 99);
  assert.equal(JSON.parse(file.state.text).gradeHistory[0].n, 2);
  assert.equal(repo.hasConflict(), false);
});

test("noms i rotació de les còpies de seguretat", () => {
  assert.equal(backupFileName(new Date(2026, 10, 19, 15, 3, 9)), "ra-avaluacio-copia-2026-11-19-150309.json");
  const names = Array.from({length: BACKUPS_TO_KEEP + 3}, (_, i) => `ra-avaluacio-copia-2026-11-${String(i + 1).padStart(2, "0")}-000000.json`);
  const del = backupsToDelete([...names, "altre-fitxer.json"]);
  assert.deepEqual(del, names.slice(0, 3));
  assert.deepEqual(backupsToDelete(names.slice(0, 5)), []);
});

test("en tornar a donar permís, si el fitxer difereix de la còpia local es marca conflicte i no s'hi escriu a sobre", async () => {
  const file = fakeFile(JSON.stringify(db(1)));
  const cache = memoryCache();
  await cache.save(db(1));
  const repo = new FileBackedRepository(cache);
  repo.useHandle(file.handle);
  // el fitxer s'edita a fora mentre l'app només tenia la còpia local
  file.state.text = JSON.stringify(db(7)); file.state.modified += 1;
  await repo.checkAfterReconnect();
  assert.equal(repo.hasConflict(), true);
  await assert.rejects(repo.save(db(1)), ExternalChangeError);
  assert.equal(JSON.parse(file.state.text).gradeHistory[0].n, 7);
  const theirs = await repo.resolveTakeTheirs();
  assert.equal((theirs.gradeHistory[0] as unknown as {n: number}).n, 7);
});

test("en tornar a donar permís, si el fitxer coincideix amb la còpia local no hi ha conflicte", async () => {
  const file = fakeFile(JSON.stringify(db(1), null, 2));
  const cache = memoryCache();
  await cache.save(db(1));
  const repo = new FileBackedRepository(cache);
  repo.useHandle(file.handle);
  await repo.checkAfterReconnect();
  assert.equal(repo.hasConflict(), false);
  await repo.save(db(2));
  assert.equal(JSON.parse(file.state.text).gradeHistory[0].n, 2);
});

test("un fitxer amb JSON invàlid no se sobreescriu en silenci: queda en conflicte i en fa còpia en conservar", async () => {
  const file = fakeFile("{ aquest json està trencat ");
  const repo = new FileBackedRepository(memoryCache());
  repo.useHandle(file.handle);
  await repo.load();
  assert.equal(repo.hasConflict(), true);
  assert.ok(repo.readProblem());
  await assert.rejects(repo.save(db(2)), ExternalChangeError);
  assert.equal(file.state.text, "{ aquest json està trencat ");
  let backed = "";
  (repo as unknown as {backupText: (t: string) => Promise<string>}).backupText = async t => { backed = t; return "còpia"; };
  await repo.resolveKeepMine(db(2));
  assert.equal(backed, "{ aquest json està trencat ");
  assert.equal(JSON.parse(file.state.text).gradeHistory[0].n, 2);
  assert.equal(repo.readProblem(), null);
});

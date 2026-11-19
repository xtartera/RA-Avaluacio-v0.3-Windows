import assert from "node:assert/strict";
import {test} from "node:test";
import {
  BACKUPS_TO_KEEP, ExternalChangeError, FileBackedRepository, backupFileName, backupsToDelete,
  type AppRepository
} from "../src/model/repository.ts";
import {migrateDatabase, type AppDatabase} from "../src/model/domain.ts";

const course = (id: string, n: number) => ({
  id, academicYear: "2026-27", active: true, archived: false, isTest: false, groups: [], imports: [],
  createdAt: "x", updatedAt: "x", configuration: {moduleName: id, abbreviation: id, n, activities: []}
});
/** Base de dades amb un únic curs «C» el contingut del qual és `n`. */
const db = (n: number): AppDatabase => ({schemaVersion: 1, courses: [course("C", n)], gradeHistory: []} as unknown as AppDatabase);
const two = (a: number, b: number): AppDatabase => ({schemaVersion: 1, courses: [course("A", a), course("B", b)], gradeHistory: []} as unknown as AppDatabase);
const val = (d: AppDatabase | string, id = "C") => {
  const x = typeof d === "string" ? JSON.parse(d) : d;
  return (x.courses.find((c: {id: string}) => c.id === id).configuration as {n: number}).n;
};

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
  return {load: async () => migrateDatabase(structuredClone(saved ?? db(0))), save: async d => { saved = d; }, clear: async () => { saved = null; }};
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
  assert.equal(val(file.state.text), 3);
  assert.equal(repo.hasConflict(), false);
});

test("no sobreescriu si un altre ha canviat el fitxer", async () => {
  const {file, repo} = await connected(db(1));
  file.state.text = JSON.stringify(db(99)); file.state.modified += 1; // un company desa des d'un altre ordinador
  await assert.rejects(repo.save(db(2)), ExternalChangeError);
  assert.equal(val(file.state.text), 99);
  assert.equal(repo.hasConflict(), true);
  // mentre hi ha conflicte, els següents desaments també s'aturen
  await assert.rejects(repo.save(db(3)), ExternalChangeError);
  assert.equal(val(file.state.text), 99);
});

test("només canvia la data (sincronització del Drive) i el contingut és el mateix: no és conflicte", async () => {
  const {file, repo} = await connected(db(1));
  file.state.modified += 5;
  await repo.save(db(2));
  assert.equal(val(file.state.text), 2);
});

test("resoldre amb «la seva versió» carrega el fitxer i permet continuar desant", async () => {
  const {file, repo} = await connected(db(1));
  file.state.text = JSON.stringify(db(99)); file.state.modified += 1;
  await assert.rejects(repo.save(db(2)), ExternalChangeError);
  const theirs = await repo.resolveTakeTheirs();
  assert.equal(val(theirs), 99);
  assert.equal(repo.hasConflict(), false);
  await repo.save(db(100));
  assert.equal(val(file.state.text), 100);
});

test("resoldre amb «la meva versió» sobreescriu el fitxer després de fer-ne còpia", async () => {
  const {file, repo} = await connected(db(1));
  file.state.text = JSON.stringify(db(99)); file.state.modified += 1;
  await assert.rejects(repo.save(db(2)), ExternalChangeError);
  let backed = "";
  (repo as unknown as {backupText: (t: string) => Promise<string>}).backupText = async t => { backed = t; return "còpia"; };
  await repo.resolveKeepMine(db(2));
  assert.equal(val(backed), 99);
  assert.equal(val(file.state.text), 2);
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
  assert.equal(val(file.state.text), 7);
  const theirs = await repo.resolveTakeTheirs();
  assert.equal(val(theirs), 7);
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
  assert.equal(val(file.state.text), 2);
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
  assert.equal(val(file.state.text), 2);
  assert.equal(repo.readProblem(), null);
});

test("en desar, si l'altre ha tocat un altre curs es fusiona sense avís i es desa el resultat", async () => {
  const {file, repo} = await connected(two(1, 1));
  file.state.text = JSON.stringify(two(1, 50)); file.state.modified += 1; // el company canvia el curs B
  let merged: AppDatabase | null = null; let names: string[] = [];
  repo.onMerged = (m, n) => { merged = m; names = n; };
  await repo.save(two(10, 1)); // jo canvio el curs A
  assert.equal(repo.hasConflict(), false);
  assert.equal(val(file.state.text, "A"), 10);
  assert.equal(val(file.state.text, "B"), 50);
  assert.equal(val(merged!, "A"), 10);
  assert.deepEqual(names, ["B"]);
});

test("en desar, si els dos han tocat el mateix curs hi ha conflicte i s'indica quin", async () => {
  const {file, repo} = await connected(two(1, 1));
  file.state.text = JSON.stringify(two(1, 50)); file.state.modified += 1;
  await assert.rejects(repo.save(two(1, 7)), ExternalChangeError);
  assert.deepEqual(repo.conflictingCourses(), ["B"]);
  assert.equal(val(file.state.text, "B"), 50);
});

test("syncExternal incorpora els canvis dels altres quan no tinc canvis locals", async () => {
  const {file, repo} = await connected(two(1, 1));
  assert.equal(await repo.syncExternal(two(1, 1)), null); // res de nou
  file.state.text = JSON.stringify(two(1, 50)); file.state.modified += 1;
  const r = await repo.syncExternal(two(1, 1));
  assert.equal(val(r!.merged, "B"), 50);
  assert.deepEqual(r!.fromTheirs, ["B"]);
  assert.equal(val(file.state.text, "B"), 50); // el fitxer no s'ha tocat
  assert.equal(await repo.syncExternal(r!.merged), null);
  await repo.save(r!.merged); // i es pot continuar desant
});

test("syncExternal desa la fusió quan jo tinc canvis pendents en un altre curs, i avisa si és el mateix", async () => {
  const a = await connected(two(1, 1));
  a.file.state.text = JSON.stringify(two(1, 50)); a.file.state.modified += 1;
  const r = await a.repo.syncExternal(two(10, 1));
  assert.equal(val(a.file.state.text, "A"), 10);
  assert.equal(val(r!.merged, "B"), 50);
  const b = await connected(two(1, 1));
  b.file.state.text = JSON.stringify(two(1, 50)); b.file.state.modified += 1;
  await assert.rejects(b.repo.syncExternal(two(1, 7)), ExternalChangeError);
  assert.equal(b.repo.hasConflict(), true);
});

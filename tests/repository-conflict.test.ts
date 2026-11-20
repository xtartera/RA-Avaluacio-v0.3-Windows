import assert from "node:assert/strict";
import {test} from "node:test";
import {
  BACKUPS_TO_KEEP, ExternalChangeError, FolderBackedRepository, assembleDatabase, backupFileName, backupsToDelete,
  courseFileName, splitDatabase, type AppRepository
} from "../src/model/repository.ts";
import {migrateDatabase, type AppDatabase} from "../src/model/domain.ts";

const course = (id: string, n: number, extra: Record<string, unknown> = {}) => ({
  id, academicYear: "2026–2027", active: false, archived: false, isTest: false, groups: [], imports: [],
  createdAt: `2026-01-0${id.length}T00:00:00Z`.replace(/0(\d)T/, "0$1T"), updatedAt: "x",
  configuration: {moduleName: `Mòdul ${id}`, abbreviation: id, n, activities: []}, ...extra
});
const mk = (...courses: ReturnType<typeof course>[]) => ({schemaVersion: 1, courses, gradeHistory: []} as unknown as AppDatabase);
const two = (a: number, b: number) => mk(course("A", a), course("B", b));
const nOf = (d: AppDatabase, id: string) => (d.courses.find(c => c.id === id)?.configuration as unknown as {n: number} | undefined)?.n;

/** Carpeta simulada: fitxers amb contingut i data de modificació controlables. */
function fakeFolder() {
  const files = new Map<string, {text: string; modified: number}>();
  const writes: string[] = [];
  let clock = 1;
  const handleFor = (name: string) => ({
    kind: "file", name,
    getFile: async () => ({text: async () => files.get(name)!.text, lastModified: files.get(name)!.modified, size: files.get(name)!.text.length}),
    createWritable: async () => {
      let buffer = "";
      return {write: async (t: string) => { buffer += t; }, close: async () => { files.set(name, {text: buffer, modified: ++clock}); writes.push(name); }};
    }
  });
  const dir = {
    name: "dades-RA", kind: "directory",
    queryPermission: async () => "granted", requestPermission: async () => "granted",
    entries: async function* () { for (const name of [...files.keys()]) yield [name, handleFor(name)]; },
    getFileHandle: async (name: string, options?: {create?: boolean}) => {
      if (!files.has(name)) { if (!options?.create) throw new Error("NotFound"); files.set(name, {text: "", modified: ++clock}); }
      return handleFor(name);
    },
    removeEntry: async (name: string) => { files.delete(name); }
  };
  return {
    files, writes, dir: dir as unknown as FileSystemDirectoryHandle,
    put(name: string, text: string) { files.set(name, {text, modified: ++clock}); },
    putDatabase(db: AppDatabase) { for (const p of splitDatabase(db)) this.put(courseFileName(p.course), JSON.stringify(p, null, 2)); },
    read(id: string) {
      for (const [, f] of files) { try { const p = JSON.parse(f.text); if (p.course?.id === id) return p; } catch { /* no és JSON */ } }
      return null;
    },
    fileOf(id: string) { for (const [name, f] of files) { try { if (JSON.parse(f.text).course?.id === id) return name; } catch { /* no és JSON */ } } return null; }
  };
}

const memoryCache = (initial?: AppDatabase): AppRepository => {
  let saved: AppDatabase | null = initial ?? null;
  return {load: async () => migrateDatabase(structuredClone(saved ?? mk())), save: async d => { saved = d; }, clear: async () => { saved = null; }};
};

async function connected(initial: AppDatabase) {
  const fs = fakeFolder();
  fs.putDatabase(initial);
  const repo = new FolderBackedRepository(memoryCache());
  repo.useFolder(fs.dir);
  const loaded = await repo.load();
  fs.writes.length = 0;
  return {fs, repo, loaded};
}

test("una carpeta amb un fitxer per curs es llegeix com una única base de dades", async () => {
  const {loaded} = await connected(two(1, 2));
  assert.deepEqual(loaded.courses.map(c => c.id).sort(), ["A", "B"]);
  assert.equal(nOf(loaded, "B"), 2);
});

test("només s'escriuen els fitxers dels cursos que han canviat", async () => {
  const {fs, repo} = await connected(two(1, 1));
  await repo.save(two(1, 1));
  assert.equal(fs.writes.length, 0);
  await repo.save(two(10, 1));
  assert.equal(fs.writes.length, 1);
  assert.equal(fs.read("A").course.configuration.n, 10);
  assert.equal(fs.read("B").course.configuration.n, 1);
});

test("el curs seleccionat (active) no es guarda ni provoca escriptures", async () => {
  const {fs, repo} = await connected(two(1, 1));
  const selected = two(1, 1); selected.courses[0].active = true;
  await repo.save(selected);
  assert.equal(fs.writes.length, 0);
  const changed = two(5, 1); changed.courses[0].active = true;
  await repo.save(changed);
  assert.equal(fs.read("A").course.active, false);
});

test("si un altre canvia un curs diferent, es fusiona sense avís", async () => {
  const {fs, repo} = await connected(two(1, 1));
  const other = JSON.parse(fs.files.get(fs.fileOf("B")!)!.text); other.course.configuration.n = 50;
  fs.put(fs.fileOf("B")!, JSON.stringify(other, null, 2));
  let merged: AppDatabase | null = null; let names: string[] = [];
  repo.onMerged = (m, n) => { merged = m; names = n; };
  await repo.save(two(10, 1));
  assert.equal(repo.hasConflict(), false);
  assert.equal(fs.read("A").course.configuration.n, 10);
  assert.equal(fs.read("B").course.configuration.n, 50);
  assert.equal(nOf(merged!, "B"), 50);
  assert.deepEqual(names, ["B"]);
});

test("si els dos canvien el mateix curs hi ha conflicte i no s'escriu res", async () => {
  const {fs, repo} = await connected(two(1, 1));
  const other = JSON.parse(fs.files.get(fs.fileOf("B")!)!.text); other.course.configuration.n = 50;
  fs.put(fs.fileOf("B")!, JSON.stringify(other, null, 2));
  fs.writes.length = 0;
  await assert.rejects(repo.save(two(10, 7)), ExternalChangeError);
  assert.deepEqual(repo.conflictingCourses(), ["B"]);
  assert.equal(fs.writes.length, 0);
  assert.equal(fs.read("B").course.configuration.n, 50);
  await assert.rejects(repo.save(two(10, 7)), ExternalChangeError); // segueix aturat mentre no es resol
});

test("«la seva versió»: els cursos en conflicte agafen el de la carpeta i la resta es desa", async () => {
  const {fs, repo} = await connected(two(1, 1));
  const other = JSON.parse(fs.files.get(fs.fileOf("B")!)!.text); other.course.configuration.n = 50;
  fs.put(fs.fileOf("B")!, JSON.stringify(other, null, 2));
  await assert.rejects(repo.save(two(10, 7)), ExternalChangeError);
  const result = await repo.resolveTakeTheirs(two(10, 7));
  assert.equal(nOf(result, "A"), 10);
  assert.equal(nOf(result, "B"), 50);
  assert.equal(fs.read("A").course.configuration.n, 10);
  assert.equal(fs.read("B").course.configuration.n, 50);
  assert.equal(repo.hasConflict(), false);
  await repo.save(result);
});

test("«la meva versió»: es fa còpia de la carpeta i després es sobreescriu", async () => {
  const {fs, repo} = await connected(two(1, 1));
  const other = JSON.parse(fs.files.get(fs.fileOf("B")!)!.text); other.course.configuration.n = 50;
  fs.put(fs.fileOf("B")!, JSON.stringify(other, null, 2));
  await assert.rejects(repo.save(two(10, 7)), ExternalChangeError);
  const backups: [string, string][] = [];
  (repo as unknown as {backupText: (t: string, l?: string) => Promise<string>}).backupText = async (t, l = "") => { backups.push([l, t]); return "còpia"; };
  await repo.resolveKeepMine(two(10, 7));
  assert.equal(backups.length, 1);
  assert.equal(JSON.parse(backups[0][1]).course.configuration.n, 50);
  assert.equal(fs.read("B").course.configuration.n, 7);
  assert.equal(repo.hasConflict(), false);
});

test("un curs nou d'un altre apareix; un esborrat per un altre desapareix; el que esborro jo s'esborra de la carpeta", async () => {
  const {fs, repo} = await connected(two(1, 1));
  fs.putDatabase(mk(course("CC", 3)));            // un altre en crea un
  const added = await repo.syncExternal(two(1, 1));
  assert.deepEqual(added!.merged.courses.map(c => c.id).sort(), ["A", "B", "CC"]);
  fs.files.delete(fs.fileOf("B")!);                  // un altre n'esborra un
  const removed = await repo.syncExternal(added!.merged);
  assert.deepEqual(removed!.merged.courses.map(c => c.id).sort(), ["A", "CC"]);
  await repo.save(mk(course("A", 1)));               // jo esborro CC
  assert.equal(fs.fileOf("CC"), null);
  assert.ok(fs.fileOf("A"));
});

test("un fitxer il·legible no es dona per esborrat ni se sobreescriu", async () => {
  const {fs, repo} = await connected(two(1, 1));
  const name = fs.fileOf("B")!;
  fs.put(name, "{ aquest json està trencat ");
  fs.writes.length = 0;
  assert.equal(await repo.syncExternal(two(1, 1)), null);
  assert.ok(repo.readProblem());
  await repo.save(two(1, 99)); // canvio el curs la còpia del qual és il·legible a la carpeta
  assert.equal(fs.files.get(name)!.text, "{ aquest json està trencat ");
  await repo.save(two(2, 99)); // i el meu A continua desant-se
  assert.equal(fs.read("A").course.configuration.n, 2);
});

test("fitxers que no són de cursos (l'antic JSON únic, còpies) s'ignoren", async () => {
  const fs = fakeFolder();
  fs.putDatabase(two(1, 1));
  fs.put("ra-avaluacio.json", JSON.stringify({schemaVersion: 1, courses: [], gradeHistory: []}));
  fs.put("ra-avaluacio-copia-2026-11-19-100000.json", "{}");
  fs.put("notes.txt", "hola");
  const repo = new FolderBackedRepository(memoryCache());
  repo.useFolder(fs.dir);
  const loaded = await repo.load();
  assert.equal(loaded.courses.length, 2);
  assert.equal(repo.readProblem(), null);
});

test("en tornar a donar permís: si la còpia local difereix de la carpeta es marca conflicte i es pot carregar la carpeta", async () => {
  const fs = fakeFolder();
  fs.putDatabase(two(1, 50));
  const repo = new FolderBackedRepository(memoryCache(two(1, 1)));
  repo.useFolder(fs.dir);
  await repo.checkAfterReconnect();
  assert.equal(repo.hasConflict(), true);
  assert.deepEqual(repo.conflictingCourses(), ["B"]);
  await assert.rejects(repo.save(two(1, 1)), ExternalChangeError);
  assert.equal(fs.read("B").course.configuration.n, 50);
  const theirs = await repo.resolveTakeTheirs(two(1, 1));
  assert.equal(nOf(theirs, "B"), 50);
  assert.equal(repo.hasConflict(), false);
});

test("en tornar a donar permís: si coincideixen no hi ha conflicte", async () => {
  const fs = fakeFolder();
  fs.putDatabase(two(1, 1));
  const repo = new FolderBackedRepository(memoryCache(two(1, 1)));
  repo.useFolder(fs.dir);
  await repo.checkAfterReconnect();
  assert.equal(repo.hasConflict(), false);
});

test("en tornar a donar permís amb canvis sense connexió: «la meva» no esborra els cursos que només són a la carpeta", async () => {
  const fs = fakeFolder();
  fs.putDatabase(mk(course("A", 1), course("B", 1), course("CC", 3)));
  const repo = new FolderBackedRepository(memoryCache(two(10, 1)));
  repo.useFolder(fs.dir);
  await repo.checkAfterReconnect();
  assert.equal(repo.hasConflict(), true);
  (repo as unknown as {backupText: () => Promise<string>}).backupText = async () => "còpia";
  await repo.resolveKeepMine(two(10, 1));
  assert.equal(fs.read("A").course.configuration.n, 10);
  assert.ok(fs.fileOf("CC"));
});

test("el format de fitxer: un fitxer per curs, nom estable i historial repartit per curs", () => {
  const withGrades = (id: string, gradeId: string) => course(id, 1, {groups: [{id: "g", students: [], enrollments: [], grades: [{id: gradeId}], activityStates: []}]});
  const db = {schemaVersion: 1, courses: [withGrades("A", "g1"), withGrades("B", "g2")], gradeHistory: [
    {id: "h1", gradeId: "g1"}, {id: "h2", gradeId: "g2"}, {id: "h3", gradeId: "g1"}]} as unknown as AppDatabase;
  const parts = splitDatabase(db);
  assert.deepEqual(parts.map(p => p.gradeHistory.map(h => h.id)), [["h1", "h3"], ["h2"]]);
  assert.match(courseFileName(parts[0].course), /^A-2026-2027__A\.json$/);
  assert.equal(assembleDatabase(parts).gradeHistory.length, 3);
});

test("noms i rotació de les còpies de seguretat", () => {
  assert.equal(backupFileName(new Date(2026, 10, 19, 15, 3, 9)), "ra-avaluacio-copia-2026-11-19-150309.json");
  assert.equal(backupFileName(new Date(2026, 10, 19, 15, 3, 9), "SOX"), "ra-avaluacio-copia-SOX-2026-11-19-150309.json");
  const names = Array.from({length: BACKUPS_TO_KEEP + 3}, (_, i) => `ra-avaluacio-copia-2026-11-${String(i + 1).padStart(2, "0")}-000000.json`);
  assert.deepEqual(backupsToDelete([...names, "altre-fitxer.json"]), names.slice(0, 3));
  assert.deepEqual(backupsToDelete(names.slice(0, 5)), []);
});

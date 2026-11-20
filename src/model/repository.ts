import {migrateDatabase, type AcademicCourse, type AppDatabase, type GradeHistoryEntry} from "./domain.ts";
import {courseLabel, deepEqual, mergeDatabases} from "./mergeDatabases.ts";

export interface AppRepository {
  load(): Promise<AppDatabase>;
  save(data: AppDatabase): Promise<void>;
  clear(): Promise<void>;
}

const EMPTY: AppDatabase = {schemaVersion: 1, courses: [], gradeHistory: []};
const DB_NAME = "ra-avaluacio";
const DB_VERSION = 3;
const STATE_STORE = "state";
const HANDLE_STORE = "handles";
const ATTACHMENT_STORE = "attachments";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STATE_STORE)) db.createObjectStore(STATE_STORE);
      if (!db.objectStoreNames.contains(HANDLE_STORE)) db.createObjectStore(HANDLE_STORE);
      if (!db.objectStoreNames.contains(ATTACHMENT_STORE)) db.createObjectStore(ATTACHMENT_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class IndexedDbRepository implements AppRepository {
  async load(): Promise<AppDatabase> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STATE_STORE, "readonly").objectStore(STATE_STORE).get("database");
      request.onsuccess = () => resolve(migrateDatabase(request.result ?? structuredClone(EMPTY)));
      request.onerror = () => reject(request.error);
    });
  }
  async save(data: AppDatabase): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STATE_STORE, "readwrite");
      tx.objectStore(STATE_STORE).put(data, "database");
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
  }
  async clear(): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STATE_STORE, "readwrite"); tx.objectStore(STATE_STORE).clear();
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
  }
}

/**
 * Còpia dels PDF originals dels qüestionaris diagnòstics. Es guarden a part de la base de dades
 * principal (que es reescriu sencera a cada canvi) perquè pesen centenars de KB cadascun.
 */
export async function putAttachment(id: string, data: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(ATTACHMENT_STORE, "readwrite");
    tx.objectStore(ATTACHMENT_STORE).put(data, id);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}
export async function getAttachment(id: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(ATTACHMENT_STORE, "readonly").objectStore(ATTACHMENT_STORE).get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}
export async function deleteAttachment(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(ATTACHMENT_STORE, "readwrite");
    tx.objectStore(ATTACHMENT_STORE).delete(id);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}

/** Valors guardats a IndexedDB: handles de carpetes (no es poden serialitzar fora d'IndexedDB). */
async function getStored<T>(key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(HANDLE_STORE, "readonly").objectStore(HANDLE_STORE).get(key);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}
async function putStored(key: string, value: unknown | null): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, "readwrite");
    if (value) tx.objectStore(HANDLE_STORE).put(value, key); else tx.objectStore(HANDLE_STORE).delete(key);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}

/** Les dades d'un curs han canviat fora d'aquesta sessió (un altre company, el Drive…) i també aquí. */
export class ExternalChangeError extends Error {
  constructor() {
    super("Les dades han estat modificades per una altra sessió. No s'ha desat res per no sobreescriure aquests canvis.");
    this.name = "ExternalChangeError";
  }
}

export const BACKUPS_TO_KEEP = 30;
const BACKUP_PREFIX = "ra-avaluacio-copia-";

export function backupFileName(date: Date, label = ""): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const tag = label ? `${slug(label)}-` : "";
  return `${BACKUP_PREFIX}${tag}${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}.json`;
}

/** Noms de còpia antics que cal esborrar per quedar-se només amb les `keep` més recents. */
export function backupsToDelete(names: string[], keep = BACKUPS_TO_KEEP): string[] {
  const ours = names.filter(n => n.startsWith(BACKUP_PREFIX) && n.endsWith(".json")).sort();
  return ours.length > keep ? ours.slice(0, ours.length - keep) : [];
}

function stampOf(file: File): string {
  return `${file.lastModified}:${file.size}`;
}

function downloadText(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], {type: "application/json"}));
  const a = document.createElement("a");
  a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------------------------
// Format de la carpeta de dades: un fitxer JSON per curs.
// ---------------------------------------------------------------------------------------------

export const COURSE_FILE_FORMAT = "ra-avaluacio-curs";

export interface CourseFilePayload {
  format: typeof COURSE_FILE_FORMAT;
  version: 1;
  course: AcademicCourse;
  gradeHistory: GradeHistoryEntry[];
}

function slug(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "curs";
}

/** Nom de fitxer estable i llegible: «SOX-2026-2027__ab12cd34.json». */
export function courseFileName(course: AcademicCourse): string {
  const tail = course.id.replace(/[^A-Za-z0-9]/g, "").slice(-8);
  return `${slug(course.configuration.abbreviation || course.configuration.moduleName)}-${slug(course.academicYear)}__${tail}.json`;
}

/**
 * El curs seleccionat és una preferència de cada persona i no s'ha de guardar a les dades compartides:
 * si ho fos, triar un curs modificaria els fitxers dels altres. Al fitxer sempre hi va `active: false`.
 */
function normalizeCourse(course: AcademicCourse): AcademicCourse {
  return course.active ? {...course, active: false} : course;
}

const byId = (a: {id: string}, b: {id: string}) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function splitDatabase(db: AppDatabase): CourseFilePayload[] {
  return db.courses.map(course => {
    const gradeIds = new Set(course.groups.flatMap(g => g.grades.map(x => x.id)));
    return {
      format: COURSE_FILE_FORMAT, version: 1 as const, course: normalizeCourse(course),
      gradeHistory: db.gradeHistory.filter(h => gradeIds.has(h.gradeId)).sort(byId)
    };
  });
}

export function assembleDatabase(payloads: CourseFilePayload[]): AppDatabase {
  const courses = payloads.map(p => p.course).sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : byId(a, b)));
  return {schemaVersion: 1, courses, gradeHistory: payloads.flatMap(p => p.gradeHistory)};
}

function normalizeDatabase(db: AppDatabase): AppDatabase {
  return migrateDatabase({...structuredClone(db), courses: structuredClone(db.courses).map(normalizeCourse)});
}

function parsePayload(raw: unknown): CourseFilePayload | null {
  const r = raw as {format?: unknown; course?: AcademicCourse; gradeHistory?: unknown} | null;
  if (!r || r.format !== COURSE_FILE_FORMAT) return null; // altres JSON (p. ex. l'antic ra-avaluacio.json): s'ignoren
  const c = r.course;
  if (!c || typeof c.id !== "string" || !Array.isArray(c.groups) || !c.configuration) throw new Error("falta el curs o és incomplet");
  const migrated = migrateDatabase({schemaVersion: 1, courses: [c], gradeHistory: []}).courses[0];
  const history = (Array.isArray(r.gradeHistory) ? (r.gradeHistory as GradeHistoryEntry[]) : []).slice().sort(byId);
  return {format: COURSE_FILE_FORMAT, version: 1, course: normalizeCourse(migrated), gradeHistory: history};
}

interface DiskEntry {name: string; stamp: string; text: string; payload: CourseFilePayload}
interface Scan {entries: Map<string, DiskEntry>; problems: Map<string, string>}

type DirWithEntries = FileSystemDirectoryHandle & {entries(): AsyncIterable<[string, FileSystemHandle]>};

/** Llegeix la carpeta. Només rellegeix el contingut dels fitxers que han canviat respecte a `known`. */
async function scanFolder(dir: FileSystemDirectoryHandle, known: Map<string, DiskEntry>): Promise<Scan> {
  const entries = new Map<string, DiskEntry>(), problems = new Map<string, string>();
  for await (const [name, handle] of (dir as DirWithEntries).entries()) {
    if (handle.kind !== "file" || !name.endsWith(".json") || name.startsWith(BACKUP_PREFIX)) continue;
    const previous = known.get(name);
    try {
      const file = await (handle as FileSystemFileHandle).getFile();
      const stamp = stampOf(file);
      if (previous && previous.stamp === stamp) { entries.set(name, previous); continue; }
      const text = await file.text();
      if (previous && previous.text === text) { entries.set(name, {...previous, stamp}); continue; }
      const payload = parsePayload(JSON.parse(text));
      if (payload) entries.set(name, {name, stamp, text, payload});
    } catch (e) {
      problems.set(name, e instanceof Error ? e.message : String(e));
      if (previous) entries.set(name, previous); // es manté l'última versió bona: no es dona el curs per esborrat
    }
  }
  return {entries, problems};
}

export type FileConnection =
  | {status: "unsupported"}
  | {status: "disconnected"}
  | {status: "connected"; fileName: string}
  | {status: "needs-permission"; fileName: string};

/**
 * Desa sempre a IndexedDB (còpia local) i, si hi ha una carpeta connectada amb permís, hi escriu un
 * fitxer JSON per curs. Cada persona només modifica els fitxers dels cursos que ha canviat, i abans
 * de desar es combinen (per curs) els canvis que altres sessions hagin fet a la carpeta.
 * (`fileName` de FileConnection és el nom de la carpeta.)
 */
export class FolderBackedRepository implements AppRepository {
  private readonly cache: AppRepository;
  private dir: FileSystemDirectoryHandle | null = null;
  private backupDir: FileSystemDirectoryHandle | null = null;
  /** Estat de la carpeta tal com la vam llegir o escriure per última vegada (la «base» de les fusions). */
  private known = new Map<string, DiskEntry>();
  private problems = new Map<string, string>();
  private conflict = false;
  private conflictIds = new Set<string>();
  private conflictNames: string[] = [];
  private reconnectConflict = false;

  /** S'avisa quan una fusió automàtica ha incorporat canvis d'altres sessions. */
  onMerged: ((merged: AppDatabase, fromTheirs: string[]) => void) | null = null;

  constructor(cache: AppRepository = new IndexedDbRepository()) {
    this.cache = cache;
  }

  /** Per a proves: fixa directament la carpeta connectada. */
  useFolder(dir: FileSystemDirectoryHandle | null): void {
    this.dir = dir; this.known = new Map(); this.problems = new Map(); this.clearConflict();
  }

  isSupported(): boolean {
    return typeof window !== "undefined" && "showDirectoryPicker" in window;
  }

  hasConflict(): boolean { return this.conflict; }
  /** Noms dels cursos que han canviat per les dues bandes. */
  conflictingCourses(): string[] { return this.conflictNames; }
  /** Fitxers de la carpeta que no s'han pogut llegir (null si tot és correcte). */
  readProblem(): string | null {
    if (!this.problems.size) return null;
    return `No s'ha pogut llegir: ${[...this.problems].map(([n, m]) => `${n} (${m})`).join("; ")}. Aquests fitxers no es tocaran.`;
  }

  private clearConflict(): void {
    this.conflict = false; this.reconnectConflict = false; this.conflictIds = new Set(); this.conflictNames = [];
  }
  private flagConflict(courses: AcademicCourse[]): void {
    this.conflict = true;
    this.conflictIds = new Set(courses.map(c => c.id));
    this.conflictNames = courses.map(courseLabel);
  }

  async init(): Promise<FileConnection> {
    if (!this.isSupported()) return {status: "unsupported"};
    this.dir = await getStored<FileSystemDirectoryHandle>("dataDir");
    this.backupDir = await getStored<FileSystemDirectoryHandle>("backupDir");
    if (!this.dir) return {status: "disconnected"};
    return (await this.dir.queryPermission({mode: "readwrite"})) === "granted"
      ? {status: "connected", fileName: this.dir.name}
      : {status: "needs-permission", fileName: this.dir.name};
  }

  private async granted(): Promise<boolean> {
    return !!this.dir && (await this.dir.queryPermission({mode: "readwrite"})) === "granted";
  }

  /** Connecta una carpeta BUIDA de dades; el següent desament hi escriu un fitxer per curs. */
  async connectNew(): Promise<FileConnection> {
    const dir = await window.showDirectoryPicker({mode: "readwrite"});
    const scan = await scanFolder(dir, new Map());
    if (scan.entries.size > 0) throw new Error("Aquesta carpeta ja conté dades de cursos. Per connectar-t'hi, fes servir «Obre una carpeta existent».");
    await this.adopt(dir);
    return {status: "connected", fileName: dir.name};
  }

  /** Connecta una carpeta que ja té dades (les carregarà el cridant amb load()). */
  async connectExisting(): Promise<FileConnection> {
    const dir = await window.showDirectoryPicker({mode: "readwrite"});
    if ((await dir.requestPermission({mode: "readwrite"})) !== "granted") throw new Error("Cal concedir permís d'escriptura per connectar aquesta carpeta.");
    const scan = await scanFolder(dir, new Map());
    if (scan.entries.size === 0) throw new Error("Aquesta carpeta no conté cap curs de RA · Avaluació.");
    await this.adopt(dir);
    return {status: "connected", fileName: dir.name};
  }

  private async adopt(dir: FileSystemDirectoryHandle): Promise<void> {
    this.dir = dir; this.known = new Map(); this.problems = new Map(); this.clearConflict();
    await putStored("dataDir", dir);
  }

  async requestPermission(): Promise<FileConnection> {
    if (!this.dir) return {status: "disconnected"};
    if ((await this.dir.requestPermission({mode: "readwrite"})) !== "granted") return {status: "needs-permission", fileName: this.dir.name};
    await this.checkAfterReconnect();
    return {status: "connected", fileName: this.dir.name};
  }

  /**
   * En obrir l'app sense permís, load() només ha pogut llegir la còpia local. En concedir-lo es compara
   * amb la carpeta real: si hi ha cursos diferents, es marca conflicte en lloc d'escriure-hi a sobre.
   */
  async checkAfterReconnect(): Promise<void> {
    if (!this.dir) return;
    try {
      const scan = await scanFolder(this.dir, new Map());
      this.problems = scan.problems;
      this.known = scan.entries;
      if (scan.entries.size === 0) return;
      const disk = new Map([...scan.entries.values()].map(e => [e.payload.course.id, e.payload.course]));
      const mine = normalizeDatabase(await this.cache.load());
      const differing = mine.courses.filter(c => !disk.has(c.id) || !deepEqual(disk.get(c.id), c));
      if (differing.length) { this.flagConflict(differing); this.reconnectConflict = true; }
    } catch {
      // Carpeta il·legible: es manté el comportament anterior (només còpia local).
    }
  }

  async disconnect(): Promise<void> {
    this.dir = null; this.known = new Map(); this.problems = new Map(); this.clearConflict();
    await putStored("dataDir", null);
  }

  async load(): Promise<AppDatabase> {
    if (await this.granted()) {
      try {
        const scan = await scanFolder(this.dir!, new Map());
        this.problems = scan.problems;
        if (scan.entries.size > 0) {
          this.known = scan.entries;
          const loaded = migrateDatabase(assembleDatabase([...scan.entries.values()].map(e => e.payload)));
          await this.cache.save(loaded);
          return loaded;
        }
      } catch {
        // Carpeta il·legible: es continua amb la còpia local.
      }
    }
    return this.cache.load();
  }

  async save(data: AppDatabase): Promise<void> {
    await this.cache.save(data);
    if (!(await this.granted())) return;
    if (this.conflict) throw new ExternalChangeError();
    const result = await this.reconcile(data);
    if (result.fromTheirs.length) this.onMerged?.(result.merged, result.fromTheirs);
  }

  /** Comprova (p. ex. en tornar a la finestra) si altres sessions han canviat la carpeta i n'incorpora els canvis. */
  async syncExternal(mine: AppDatabase): Promise<{merged: AppDatabase; fromTheirs: string[]} | null> {
    if (this.conflict || !(await this.granted())) return null;
    const result = await this.reconcile(mine);
    return result.fromTheirs.length ? {merged: result.merged, fromTheirs: result.fromTheirs} : null;
  }

  /**
   * Fusiona (per curs, a tres bandes) la base coneguda, l'estat d'aquesta sessió i el contingut actual de la
   * carpeta, i escriu només els fitxers que cal. Llança ExternalChangeError si algun curs ha canviat per les dues bandes
   * (excepte els cursos de `overrides`, on es força la versió indicada).
   */
  private async reconcile(mine: AppDatabase, overrides?: Map<string, "mine" | "theirs">, extraDiskCourses = false): Promise<{merged: AppDatabase; fromTheirs: string[]}> {
    const dir = this.dir!;
    const scan = await scanFolder(dir, this.known);
    this.problems = scan.problems;
    const theirsDb = assembleDatabase([...scan.entries.values()].map(e => e.payload));
    const baseDb = assembleDatabase([...this.known.values()].map(e => e.payload));
    const mineDb = normalizeDatabase(mine);
    if (extraDiskCourses) { // després d'una reconnexió: els cursos que només són a la carpeta no s'han d'entendre com a esborrats
      const have = new Set(mineDb.courses.map(c => c.id));
      for (const c of theirsDb.courses) if (!have.has(c.id)) mineDb.courses.push(structuredClone(c));
    }
    const r = mergeDatabases(baseDb, mineDb, theirsDb);
    const unresolved = r.conflicts.filter(c => !overrides?.has(c.id));
    if (unresolved.length) { this.flagConflict(unresolved); throw new ExternalChangeError(); }

    let courses = r.merged.courses;
    for (const [id, choice] of overrides ?? []) {
      const source = (choice === "mine" ? mineDb : theirsDb).courses.find(c => c.id === id);
      const index = courses.findIndex(c => c.id === id);
      if (source && index >= 0) courses[index] = source;
      else if (source) courses = [...courses, source];
      else if (index >= 0) courses = courses.filter(c => c.id !== id);
    }
    const merged: AppDatabase = {...r.merged, courses};

    const diskByCourse = new Map([...scan.entries.values()].map(e => [e.payload.course.id, e]));
    const usedNames = new Set(scan.entries.keys());
    for (const payload of splitDatabase(merged)) {
      const entry = diskByCourse.get(payload.course.id);
      if (entry && deepEqual(entry.payload, payload)) { this.known.set(entry.name, entry); continue; }
      if (entry && this.problems.has(entry.name)) continue; // fitxer il·legible: no s'hi escriu a sobre
      let name = entry?.name ?? courseFileName(payload.course);
      if (!entry) for (let n = 2; usedNames.has(name); n++) name = courseFileName(payload.course).replace(/\.json$/, `-${n}.json`);
      usedNames.add(name);
      await this.writeFile(name, payload);
    }
    const keep = new Set(merged.courses.map(c => c.id));
    for (const entry of scan.entries.values()) {
      if (keep.has(entry.payload.course.id) || this.problems.has(entry.name)) continue;
      await this.backupIfConfigured(entry.text, entry.payload.course.configuration.abbreviation);
      await dir.removeEntry(entry.name);
      this.known.delete(entry.name);
    }
    for (const name of [...this.known.keys()]) if (!scan.entries.has(name) && !usedNames.has(name)) this.known.delete(name);
    return {merged, fromTheirs: r.fromTheirs.map(courseLabel)};
  }

  private async writeFile(name: string, payload: CourseFilePayload): Promise<void> {
    const text = JSON.stringify(payload, null, 2);
    const handle = await this.dir!.getFileHandle(name, {create: true});
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    this.known.set(name, {name, stamp: stampOf(await handle.getFile()), text, payload});
  }

  /** Conflicte: es descarten els canvis d'aquesta sessió als cursos en conflicte i es carrega el de la carpeta. */
  async resolveTakeTheirs(mine: AppDatabase): Promise<AppDatabase> {
    if (!this.dir) throw new Error("No hi ha cap carpeta connectada.");
    let result: AppDatabase;
    if (this.reconnectConflict) {
      const scan = await scanFolder(this.dir, new Map());
      this.known = scan.entries; this.problems = scan.problems;
      result = migrateDatabase(assembleDatabase([...scan.entries.values()].map(e => e.payload)));
    } else {
      const overrides = new Map([...this.conflictIds].map(id => [id, "theirs" as const]));
      result = (await this.reconcile(mine, overrides)).merged;
    }
    await this.cache.save(result);
    this.clearConflict();
    return result;
  }

  /** Conflicte: es conserva la versió d'aquesta sessió; abans es fa còpia del que hi havia a la carpeta. */
  async resolveKeepMine(data: AppDatabase): Promise<string> {
    if (!this.dir) throw new Error("No hi ha cap carpeta connectada.");
    const scan = await scanFolder(this.dir, this.known);
    const saved: string[] = [];
    for (const entry of scan.entries.values()) {
      if (this.conflictIds.has(entry.payload.course.id)) saved.push(await this.backupText(entry.text, entry.payload.course.configuration.abbreviation));
    }
    if (this.reconnectConflict) this.known = scan.entries;
    const overrides = new Map([...this.conflictIds].map(id => [id, "mine" as const]));
    const wasReconnect = this.reconnectConflict;
    await this.reconcile(data, overrides, wasReconnect);
    this.clearConflict();
    return saved.join(", ") || "cap fitxer necessitava còpia";
  }

  private async backupIfConfigured(text: string, label: string): Promise<void> {
    const dir = this.backupDir;
    if (dir && (await dir.queryPermission({mode: "readwrite"})) === "granted") await this.backupText(text, label);
  }

  /** Còpia amb data del contingut donat: a la carpeta de còpies si n'hi ha, o com a baixada. */
  async backupText(text: string, label = ""): Promise<string> {
    const name = backupFileName(new Date(), label);
    const dir = this.backupDir;
    if (dir && (await dir.queryPermission({mode: "readwrite"})) === "granted") {
      const handle = await dir.getFileHandle(name, {create: true});
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      const names: string[] = [];
      for await (const [entry] of (dir as DirWithEntries).entries()) names.push(entry);
      for (const old of backupsToDelete(names)) await dir.removeEntry(old);
      return `${name} (carpeta de còpies «${dir.name}»)`;
    }
    downloadText(name, text);
    return `${name} (descarregat)`;
  }

  backupFolderName(): string | null {
    return this.backupDir?.name ?? null;
  }

  async chooseBackupFolder(): Promise<string> {
    const dir = await window.showDirectoryPicker({mode: "readwrite"});
    this.backupDir = dir;
    await putStored("backupDir", dir);
    return dir.name;
  }

  async clear(): Promise<void> {
    await this.cache.clear();
  }
}

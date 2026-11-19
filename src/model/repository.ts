import {migrateDatabase, type AppDatabase} from "./domain.ts";

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

async function loadHandle(): Promise<FileSystemFileHandle | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(HANDLE_STORE, "readonly").objectStore(HANDLE_STORE).get("dataFile");
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}
async function storeHandle(handle: FileSystemFileHandle | null): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, "readwrite");
    if (handle) tx.objectStore(HANDLE_STORE).put(handle, "dataFile"); else tx.objectStore(HANDLE_STORE).delete("dataFile");
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}

async function loadBackupDir(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(HANDLE_STORE, "readonly").objectStore(HANDLE_STORE).get("backupDir");
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}
async function storeBackupDir(dir: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, "readwrite");
    tx.objectStore(HANDLE_STORE).put(dir, "backupDir");
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
}

const JSON_FILE_TYPE = [{description: "Base de dades RA · Avaluació", accept: {"application/json": [".json"]}}];

/** El fitxer connectat ha canviat fora d'aquesta sessió (un altre company, el Drive…) des de l'última lectura/escriptura. */
export class ExternalChangeError extends Error {
  constructor() {
    super("El fitxer de dades ha estat modificat per una altra sessió. No s'ha desat res per no sobreescriure aquests canvis.");
    this.name = "ExternalChangeError";
  }
}

export const BACKUPS_TO_KEEP = 20;
const BACKUP_PREFIX = "ra-avaluacio-copia-";

export function backupFileName(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${BACKUP_PREFIX}${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}.json`;
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

export type FileConnection =
  | {status: "unsupported"}
  | {status: "disconnected"}
  | {status: "connected"; fileName: string}
  | {status: "needs-permission"; fileName: string};

/**
 * Desa sempre a IndexedDB (còpia local, sense permisos, mai falla) i, quan hi
 * ha un fitxer connectat amb permís concedit, també llegeix/escriu aquest
 * fitxer real al disc via la File System Access API. Si el navegador no la
 * suporta, o el permís es perd, es comporta exactament com IndexedDbRepository.
 */
export class FileBackedRepository implements AppRepository {
  private readonly cache: AppRepository;
  private handle: FileSystemFileHandle | null = null;
  /** Contingut i marca (data+mida) del fitxer tal com el vam llegir o escriure per última vegada. */
  private baseline: {text: string; stamp: string} | null = null;
  private conflict = false;
  private loadProblem: string | null = null;
  private backupDir: FileSystemDirectoryHandle | null = null;

  constructor(cache: AppRepository = new IndexedDbRepository()) {
    this.cache = cache;
  }

  /** Per a proves: fixa directament el fitxer connectat. */
  useHandle(handle: FileSystemFileHandle | null): void {
    this.handle = handle; this.baseline = null; this.conflict = false;
  }

  hasConflict(): boolean {
    return this.conflict;
  }

  /** Motiu pel qual el fitxer no s'ha pogut llegir en obrir l'app (null si es va llegir bé). */
  readProblem(): string | null {
    return this.loadProblem;
  }

  isSupported(): boolean {
    return typeof window !== "undefined" && "showSaveFilePicker" in window;
  }

  async init(): Promise<FileConnection> {
    if (!this.isSupported()) return {status: "unsupported"};
    this.handle = await loadHandle();
    this.backupDir = await loadBackupDir();
    if (!this.handle) return {status: "disconnected"};
    const permission = await this.handle.queryPermission({mode: "readwrite"});
    return permission === "granted"
      ? {status: "connected", fileName: this.handle.name}
      : {status: "needs-permission", fileName: this.handle.name};
  }

  async connectNew(suggestedName: string): Promise<FileConnection> {
    const handle = await window.showSaveFilePicker({suggestedName, types: JSON_FILE_TYPE});
    this.handle = handle; this.baseline = null; this.conflict = false;
    await storeHandle(handle);
    return {status: "connected", fileName: handle.name};
  }

  async connectExisting(): Promise<FileConnection> {
    const [handle] = await window.showOpenFilePicker({types: JSON_FILE_TYPE, multiple: false});
    const permission = await handle.requestPermission({mode: "readwrite"});
    if (permission !== "granted") throw new Error("Cal concedir permís d'escriptura per connectar aquest fitxer.");
    this.handle = handle; this.baseline = null; this.conflict = false;
    await storeHandle(handle);
    return {status: "connected", fileName: handle.name};
  }

  async requestPermission(): Promise<FileConnection> {
    if (!this.handle) return {status: "disconnected"};
    const permission = await this.handle.requestPermission({mode: "readwrite"});
    if (permission !== "granted") return {status: "needs-permission", fileName: this.handle.name};
    await this.checkAfterReconnect();
    return {status: "connected", fileName: this.handle.name};
  }

  /**
   * En obrir l'app sense permís d'escriptura, load() només ha pogut llegir la còpia local. Quan
   * es concedeix el permís cal comparar-la amb el fitxer real: si difereixen, es marca conflicte
   * (la pantalla ofereix carregar la versió del fitxer o conservar la local) en lloc d'escriure-hi a sobre.
   */
  async checkAfterReconnect(): Promise<void> {
    if (!this.handle) return;
    try {
      const file = await this.handle.getFile();
      const text = await file.text();
      if (!text.trim()) return;
      const theirs = migrateDatabase(JSON.parse(text));
      const mine = await this.cache.load();
      this.baseline = {text, stamp: stampOf(file)};
      if (JSON.stringify(theirs) !== JSON.stringify(mine)) this.conflict = true;
    } catch {
      // Fitxer il·legible: es manté el comportament anterior.
    }
  }

  async disconnect(): Promise<void> {
    this.handle = null; this.baseline = null; this.conflict = false;
    await storeHandle(null);
  }

  async load(): Promise<AppDatabase> {
    if (this.handle && (await this.handle.queryPermission({mode: "readwrite"})) === "granted") {
      try {
        const file = await this.handle.getFile();
        const text = await file.text();
        if (text.trim()) {
          const parsed = migrateDatabase(JSON.parse(text));
          this.baseline = {text, stamp: stampOf(file)};
          await this.cache.save(parsed);
          return parsed;
        }
      } catch (e) {
        // Fitxer il·legible o corromput: es continua amb la còpia local, però NO s'hi escriurà a sobre
        // sense que l'usuari ho decideixi (podria ser una edició manual amb un error de sintaxi).
        this.conflict = true;
        this.loadProblem = `El fitxer no es pot llegir (${e instanceof Error ? e.message : String(e)}). Probablement té un error de sintaxi JSON.`;
      }
    }
    return this.cache.load();
  }

  async save(data: AppDatabase): Promise<void> {
    await this.cache.save(data);
    if (this.handle && (await this.handle.queryPermission({mode: "readwrite"})) === "granted") {
      if (this.conflict) throw new ExternalChangeError();
      if (this.baseline) {
        const file = await this.handle.getFile();
        const stamp = stampOf(file);
        if (stamp !== this.baseline.stamp) {
          const text = await file.text();
          if (text !== this.baseline.text) { this.conflict = true; throw new ExternalChangeError(); }
          this.baseline.stamp = stamp; // només s'ha tocat la data (sincronització del Drive): mateix contingut
        }
      }
      await this.writeFile(JSON.stringify(data, null, 2));
    }
  }

  private async writeFile(text: string): Promise<void> {
    const writable = await this.handle!.createWritable();
    await writable.write(text);
    await writable.close();
    this.baseline = {text, stamp: stampOf(await this.handle!.getFile())};
  }

  /** Conflicte: es descarten els canvis d'aquesta sessió i es carrega el contingut actual del fitxer. */
  async resolveTakeTheirs(): Promise<AppDatabase> {
    if (!this.handle) throw new Error("No hi ha cap fitxer connectat.");
    const file = await this.handle.getFile();
    const text = await file.text();
    const parsed = migrateDatabase(JSON.parse(text));
    await this.cache.save(parsed);
    this.baseline = {text, stamp: stampOf(file)};
    this.conflict = false; this.loadProblem = null;
    return parsed;
  }

  /** Conflicte: es conserva la versió d'aquesta sessió; abans es fa còpia del que hi havia al fitxer. */
  async resolveKeepMine(data: AppDatabase): Promise<string> {
    if (!this.handle) throw new Error("No hi ha cap fitxer connectat.");
    const file = await this.handle.getFile();
    const text = await file.text();
    const where = await this.backupText(text);
    this.baseline = {text, stamp: stampOf(file)};
    this.conflict = false; this.loadProblem = null;
    await this.save(data);
    return where;
  }

  /** Còpia amb data del contingut donat: a la carpeta de còpies si n'hi ha, o com a baixada. */
  async backupText(text: string): Promise<string> {
    const name = backupFileName(new Date());
    const dir = this.backupDir;
    if (dir && (await dir.queryPermission({mode: "readwrite"})) === "granted") {
      const handle = await dir.getFileHandle(name, {create: true});
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      const names: string[] = [];
      for await (const [entry] of (dir as unknown as {entries(): AsyncIterable<[string, unknown]>}).entries()) names.push(entry);
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
    await storeBackupDir(dir);
    return dir.name;
  }

  async clear(): Promise<void> {
    await this.cache.clear();
  }
}

import {migrateDatabase, type AppDatabase} from "./domain.ts";

export interface AppRepository {
  load(): Promise<AppDatabase>;
  save(data: AppDatabase): Promise<void>;
  clear(): Promise<void>;
}

const EMPTY: AppDatabase = {schemaVersion: 1, courses: [], gradeHistory: []};
const DB_NAME = "ra-avaluacio";
const DB_VERSION = 2;
const STATE_STORE = "state";
const HANDLE_STORE = "handles";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STATE_STORE)) db.createObjectStore(STATE_STORE);
      if (!db.objectStoreNames.contains(HANDLE_STORE)) db.createObjectStore(HANDLE_STORE);
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

const JSON_FILE_TYPE = [{description: "Base de dades RA · Avaluació", accept: {"application/json": [".json"]}}];

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
  private readonly cache = new IndexedDbRepository();
  private handle: FileSystemFileHandle | null = null;

  isSupported(): boolean {
    return typeof window !== "undefined" && "showSaveFilePicker" in window;
  }

  async init(): Promise<FileConnection> {
    if (!this.isSupported()) return {status: "unsupported"};
    this.handle = await loadHandle();
    if (!this.handle) return {status: "disconnected"};
    const permission = await this.handle.queryPermission({mode: "readwrite"});
    return permission === "granted"
      ? {status: "connected", fileName: this.handle.name}
      : {status: "needs-permission", fileName: this.handle.name};
  }

  async connectNew(suggestedName: string): Promise<FileConnection> {
    const handle = await window.showSaveFilePicker({suggestedName, types: JSON_FILE_TYPE});
    this.handle = handle;
    await storeHandle(handle);
    return {status: "connected", fileName: handle.name};
  }

  async connectExisting(): Promise<FileConnection> {
    const [handle] = await window.showOpenFilePicker({types: JSON_FILE_TYPE, multiple: false});
    const permission = await handle.requestPermission({mode: "readwrite"});
    if (permission !== "granted") throw new Error("Cal concedir permís d'escriptura per connectar aquest fitxer.");
    this.handle = handle;
    await storeHandle(handle);
    return {status: "connected", fileName: handle.name};
  }

  async requestPermission(): Promise<FileConnection> {
    if (!this.handle) return {status: "disconnected"};
    const permission = await this.handle.requestPermission({mode: "readwrite"});
    return permission === "granted"
      ? {status: "connected", fileName: this.handle.name}
      : {status: "needs-permission", fileName: this.handle.name};
  }

  async disconnect(): Promise<void> {
    this.handle = null;
    await storeHandle(null);
  }

  async load(): Promise<AppDatabase> {
    if (this.handle && (await this.handle.queryPermission({mode: "readwrite"})) === "granted") {
      try {
        const text = await (await this.handle.getFile()).text();
        if (text.trim()) {
          const parsed = migrateDatabase(JSON.parse(text));
          await this.cache.save(parsed);
          return parsed;
        }
      } catch {
        // Fitxer il·legible o corromput: es continua amb la còpia local.
      }
    }
    return this.cache.load();
  }

  async save(data: AppDatabase): Promise<void> {
    await this.cache.save(data);
    if (this.handle && (await this.handle.queryPermission({mode: "readwrite"})) === "granted") {
      const writable = await this.handle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
    }
  }

  async clear(): Promise<void> {
    await this.cache.clear();
  }
}

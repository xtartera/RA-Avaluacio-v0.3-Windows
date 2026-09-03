import type {AppDatabase} from "./domain.ts";

export interface AppRepository {
  load(): Promise<AppDatabase>;
  save(data: AppDatabase): Promise<void>;
  clear(): Promise<void>;
}

const EMPTY: AppDatabase = {schemaVersion: 1, courses: [], gradeHistory: []};

export class IndexedDbRepository implements AppRepository {
  private readonly dbName = "ra-avaluacio";
  private readonly storeName = "state";
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(this.storeName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async load(): Promise<AppDatabase> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(this.storeName, "readonly").objectStore(this.storeName).get("database");
      request.onsuccess = () => resolve(request.result ?? structuredClone(EMPTY));
      request.onerror = () => reject(request.error);
    });
  }
  async save(data: AppDatabase): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      tx.objectStore(this.storeName).put(data, "database");
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
  }
  async clear(): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite"); tx.objectStore(this.storeName).clear();
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
  }
}

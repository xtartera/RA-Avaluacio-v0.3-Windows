import {newId, nowIso, type AppDatabase, type Grade, type GradeHistoryEntry} from "../model/domain.ts";

export function recordGradeChange(database: AppDatabase, previous: Grade | null, next: Grade | null, action: string): GradeHistoryEntry {
  const entry = {id:newId("history"), gradeId:(next ?? previous)!.id, at:nowIso(), action, previous:previous ? structuredClone(previous) : null, next:next ? structuredClone(next) : null};
  database.gradeHistory.push(entry); return entry;
}

export function validateBackup(value: unknown): AppDatabase {
  if (!value || typeof value !== "object") throw new Error("La còpia no és vàlida.");
  const data = value as Partial<AppDatabase>;
  if (data.schemaVersion !== 1 || !Array.isArray(data.courses) || !Array.isArray(data.gradeHistory)) throw new Error("Format o versió de còpia no compatible.");
  return data as AppDatabase;
}

export function downloadJson(database: AppDatabase) {
  const blob = new Blob([JSON.stringify(database, null, 2)], {type:"application/json"});
  const link = document.createElement("a"); link.href=URL.createObjectURL(blob); link.download=`ra-avaluacio-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(link.href);
}

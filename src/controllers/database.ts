import {calculateFinalStudent, convocatoriaConsumida, convocatoriaExhaurida} from "../model/calculation.ts";
import {migrateDatabase, newId, nowIso, type AcademicCourse, type AppDatabase, type Grade, type GradeHistoryEntry, type Group} from "../model/domain.ts";

export function recordGradeChange(database: AppDatabase, previous: Grade | null, next: Grade | null, action: string): GradeHistoryEntry {
  const entry = {id:newId("history"), gradeId:(next ?? previous)!.id, at:nowIso(), action, previous:previous ? structuredClone(previous) : null, next:next ? structuredClone(next) : null};
  database.gradeHistory.push(entry); return entry;
}

export function validateBackup(value: unknown): AppDatabase {
  if (!value || typeof value !== "object") throw new Error("La còpia no és vàlida.");
  const data = value as Partial<AppDatabase>;
  if (data.schemaVersion !== 1 || !Array.isArray(data.courses) || !Array.isArray(data.gradeHistory)) throw new Error("Format o versió de còpia no compatible.");
  return migrateDatabase(data as AppDatabase);
}

export function downloadJson(database: AppDatabase) {
  const blob = new Blob([JSON.stringify(database, null, 2)], {type:"application/json"});
  const link = document.createElement("a"); link.href=URL.createObjectURL(blob); link.download=`ra-avaluacio-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(link.href);
}

const csvCell = (value: string) => value.includes(",") || value.includes("\"") || value.includes("\n") ? `"${value.replace(/"/g, "\"\"")}"` : value;

/** Acta de convocatòria: alumnat actiu d'un grup amb el resultat final (ordinària + extraordinària). */
export function buildConvocatoriaActaCsv(course: AcademicCourse, group: Group): string {
  const ras = course.configuration.learningResults.filter(r => r.status === "active");
  const header = ["Alumne", "Repetidor", "Convocatòria consumida", "Convocatòria exhaurida", ...ras.map(r => r.code), "Resultat final"];
  const rows = group.enrollments.filter(e => e.status === "active").map(enrollment => {
    const student = group.students.find(s => s.id === enrollment.studentId);
    const final = calculateFinalStudent(course, group, enrollment.id);
    const raCells = ras.map(ra => final.learningResults.get(ra.id)?.score.toFixed(2) ?? "");
    return [
      student?.name ?? "—",
      enrollment.convocatoria.isRepeater ? "Sí" : "No",
      String(convocatoriaConsumida(enrollment)),
      convocatoriaExhaurida(enrollment) ? "Sí" : "No",
      ...raCells,
      final.modulePassed ? "Superat" : "No superat",
    ];
  });
  return [header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
}

export function downloadConvocatoriaActaCsv(course: AcademicCourse, group: Group) {
  const blob = new Blob(["﻿" + buildConvocatoriaActaCsv(course, group)], {type: "text/csv;charset=utf-8"});
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `acta-convocatoria-${course.configuration.abbreviation}-${group.code}-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href);
}

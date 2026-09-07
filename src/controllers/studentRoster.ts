import {newId, nowIso, type Group} from "../model/domain.ts";

const normalizeName = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("ca").replace(/\s+/g, " ").trim();

// Keep every existing identity, enrollment and grade, including inactive students.
export function mergeStudentRoster(group: Group, names: string[]): void {
 const matched = new Set<string>();
 for (const name of names) {
  const existing = group.enrollments.find(e => !matched.has(e.id) && group.students.some(s => s.id === e.studentId && normalizeName(s.name) === normalizeName(name)));
  if (existing) {
   group.students.find(s => s.id === existing.studentId)!.name = name;
   matched.add(existing.id);
  } else {
   const student = {id: newId("student"), name};
   const enrollment = {id: newId("enrollment"), studentId: student.id, groupId: group.id, status: "active" as const, createdAt: nowIso()};
   group.students.push(student);
   group.enrollments.push(enrollment);
   matched.add(enrollment.id);
  }
 }
 for (const enrollment of group.enrollments) {
  if (enrollment.status === "active" && !matched.has(enrollment.id)) enrollment.status = "archived";
 }
}

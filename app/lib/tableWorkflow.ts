import type {AppDatabase, Grade, Group, GroupActivityState} from "../../src/model/domain.ts";
import {recordGradeChange} from "../../src/controllers/database.ts";

export type SortDirection = "asc" | "desc";
export function compareValues(a: string | number | null, b: string | number | null, direction: SortDirection): number {
 // Missing evidence stays last in both directions; a real zero remains sortable.
 if (a === null) return b === null ? 0 : 1;
 if (b === null) return -1;
 const result = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "ca", {numeric: true, sensitivity: "base"});
 return direction === "asc" ? result : -result;
}

export interface GradeUndo {
 gradeId: string;
 activityId: string;
 previous: Grade | null;
 activityState: GroupActivityState | null;
}
export function undoGrade(database: AppDatabase, group: Group, undo: GradeUndo): boolean {
 const current = group.grades.find(g => g.id === undo.gradeId);
 if (!current) return false;
 group.grades = group.grades.filter(g => g.id !== undo.gradeId);
 if (undo.previous) group.grades.push(structuredClone(undo.previous));
 group.activityStates = group.activityStates.filter(s => s.activityId !== undo.activityId);
 if (undo.activityState) group.activityStates.push(structuredClone(undo.activityState));
 recordGradeChange(database, current, undo.previous, "Desfer canvi de nota");
 return true;
}

export function activityStorageKey(courseId: string, groupId: string): string {
 return `ra-avaluacio:activity:${encodeURIComponent(courseId)}:${encodeURIComponent(groupId)}`;
}

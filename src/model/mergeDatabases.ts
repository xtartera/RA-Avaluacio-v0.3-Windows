import type {AcademicCourse, AppDatabase, GradeHistoryEntry} from "./domain.ts";

/** Comparació profunda independent de l'ordre de les claus. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  const ka = Object.keys(a as object), kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

export interface MergeResult {
  /** Base de dades fusionada. Només és fiable si `conflicts` és buit. */
  merged: AppDatabase;
  /** Cursos modificats per les dues bandes (o modificats per una i esborrats per l'altra). */
  conflicts: AcademicCourse[];
  /** Cursos que han vingut de l'altra sessió (nous o modificats per ella). */
  fromTheirs: AcademicCourse[];
}

const courseLabel = (c: AcademicCourse) => c.configuration.abbreviation || c.configuration.moduleName || c.id;
export {courseLabel};

/**
 * Fusió a tres bandes per curs: `base` és el que es va llegir/escriure per última vegada,
 * `mine` l'estat d'aquesta sessió i `theirs` el contingut actual del fitxer.
 * Un curs només s'agafa d'una banda si l'altra no l'ha tocat; si les dues l'han tocat, és conflicte.
 */
export function mergeDatabases(base: AppDatabase, mine: AppDatabase, theirs: AppDatabase): MergeResult {
  const byId = (db: AppDatabase) => new Map(db.courses.map(c => [c.id, c] as const));
  const B = byId(base), M = byId(mine), T = byId(theirs);
  const order = [...mine.courses.map(c => c.id), ...theirs.courses.map(c => c.id).filter(id => !M.has(id))];
  const courses: AcademicCourse[] = [];
  const conflicts: AcademicCourse[] = [];
  const fromTheirs: AcademicCourse[] = [];

  for (const id of order) {
    const b = B.get(id), m = M.get(id), t = T.get(id);
    if (m && t) {
      if (deepEqual(m, t)) courses.push(m);
      else if (b && deepEqual(b, m)) { courses.push(t); fromTheirs.push(t); }
      else if (b && deepEqual(b, t)) courses.push(m);
      else { conflicts.push(m); courses.push(m); }
    } else if (m && !t) {
      if (!b) courses.push(m);                      // l'he creat jo
      else if (deepEqual(b, m)) fromTheirs.push(m); // l'han esborrat ells i jo no l'he tocat: s'esborra
      else { conflicts.push(m); courses.push(m); }  // l'han esborrat i jo l'he canviat
    } else if (!m && t) {
      if (!b) { courses.push(t); fromTheirs.push(t); }  // l'han creat ells
      else if (deepEqual(b, t)) { /* l'he esborrat jo i ells no l'han tocat */ }
      else { conflicts.push(t); courses.push(t); }       // l'he esborrat i ells l'han canviat
    }
  }

  const bh = new Set(base.gradeHistory.map(h => h.id)), mh = new Set(mine.gradeHistory.map(h => h.id)), th = new Set(theirs.gradeHistory.map(h => h.id));
  const history: GradeHistoryEntry[] = [];
  for (const h of [...mine.gradeHistory, ...theirs.gradeHistory.filter(x => !mh.has(x.id))]) {
    const removedByMe = bh.has(h.id) && !mh.has(h.id), removedByThem = bh.has(h.id) && !th.has(h.id);
    if (!removedByMe && !removedByThem) history.push(h);
  }

  return {merged: {...mine, courses, gradeHistory: history}, conflicts, fromTheirs};
}

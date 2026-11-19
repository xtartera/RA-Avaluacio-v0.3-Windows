/** Mòduls que l'usuari ha marcat com a propis en aquest navegador. Si no n'hi ha cap, no s'avisa mai. */
const KEY = "ra.myCourses";

export function loadMyCourses(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveMyCourses(ids: string[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* sense emmagatzematge: es continua sense recordar-ho */ }
}

/** Cert si l'usuari ha definit els seus mòduls i el curs indicat no n'és un. */
export function isForeignCourse(mine: string[], courseId: string | null | undefined): boolean {
  return !!courseId && mine.length > 0 && !mine.includes(courseId);
}

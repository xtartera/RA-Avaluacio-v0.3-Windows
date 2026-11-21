import {normalizeKey, randomId, randomKey, safeEqual, sha256Hex} from "./crypto.ts";

/** Una persona autoritzada. La clau mai no es guarda: només el seu SHA-256. */
export interface Person {
  nom: string;
  hash: string;
  actiu: boolean;
  /** Dies que dura l'accés d'un dispositiu; null = el valor general. */
  dies: number | null;
  creat: string;
}

export interface AccessState {
  /** Dies per defecte de la sessió d'un dispositiu. */
  dies: number;
  persones: Record<string, Person>;
  /** Últim accés de cada persona (ISO). Es guarda a part perquè el porter no trepitgi mai els canvis de l'administrador. */
  ultim: Record<string, string>;
}

export const DEFAULT_DAYS = 30, MIN_DAYS = 1, MAX_DAYS = 365;
export const personKey = (id: string) => `p_${id}`;
export const lastKey = (id: string) => `u_${id}`;
export const DAYS_KEY = "dies";

export function clampDays(value: unknown, fallback: number = DEFAULT_DAYS): number {
  const n = Number(value);
  return Number.isFinite(n) && value !== null && value !== "" ? Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(n))) : fallback;
}

/** Converteix el contingut brut de l'Edge Config (claus `dies`, `p_<id>`, `u_<id>`) en l'estat de l'accés. */
export function parseState(items: Record<string, unknown>): AccessState {
  const state: AccessState = {dies: clampDays(items[DAYS_KEY]), persones: {}, ultim: {}};
  for (const [key, value] of Object.entries(items)) {
    if (key.startsWith("p_") && value && typeof value === "object") {
      const p = value as Partial<Person>;
      if (typeof p.nom === "string" && typeof p.hash === "string") {
        state.persones[key.slice(2)] = {nom: p.nom, hash: p.hash, actiu: p.actiu !== false, dies: p.dies == null ? null : clampDays(p.dies), creat: typeof p.creat === "string" ? p.creat : ""};
      }
    } else if (key.startsWith("u_") && typeof value === "string") state.ultim[key.slice(2)] = value;
  }
  return state;
}

export function sessionDays(state: AccessState, person: Person): number {
  return person.dies ?? state.dies;
}

/** Busca qui té aquesta clau. Compara amb totes les entrades, també les inactives, per no revelar res pel temps de resposta. */
export async function findByKey(state: AccessState, key: string): Promise<{id: string; person: Person} | null> {
  const normalized = normalizeKey(key);
  if (normalized.length < 16) return null;
  const hash = await sha256Hex(normalized);
  let found: {id: string; person: Person} | null = null;
  for (const [id, person] of Object.entries(state.persones)) if (safeEqual(person.hash, hash) && person.actiu) found = {id, person};
  return found;
}

/** Crea una persona nova: retorna la clau en clar (només es mostra un cop) i el que cal guardar. */
export async function newPerson(nom: string, dies: number | null, now: Date): Promise<{id: string; key: string; person: Person}> {
  const key = randomKey();
  return {id: randomId(), key, person: {nom: nom.trim(), hash: await sha256Hex(normalizeKey(key)), actiu: true, dies: dies === null ? null : clampDays(dies), creat: now.toISOString()}};
}

export async function regenerateKey(): Promise<{key: string; hash: string}> {
  const key = randomKey();
  return {key, hash: await sha256Hex(normalizeKey(key))};
}

/** Llista per al panell: mai no inclou el hash. */
export function publicList(state: AccessState): {id: string; nom: string; actiu: boolean; dies: number | null; creat: string; ultimAcces: string | null}[] {
  return Object.entries(state.persones)
    .map(([id, p]) => ({id, nom: p.nom, actiu: p.actiu, dies: p.dies, creat: p.creat, ultimAcces: state.ultim[id] ?? null}))
    .sort((a, b) => a.nom.localeCompare(b.nom, "ca"));
}

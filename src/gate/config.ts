/**
 * Comprovació de seguretat de la configuració del porter. Si les claus són febles, el porter es nega a funcionar
 * en lloc de funcionar «obert»: una contrasenya d'administrador previsible permetria crear-se una clau d'accés i saltar-se tot.
 * Els missatges mai no inclouen el valor de cap clau.
 */

export const MIN_ADMIN_KEY = 16;
export const MIN_GATE_SECRET = 32;

const KNOWN = ["admin-local", "secret-de-prova", "password", "contrasenya", "changeme", "canvia-ho", "12345678", "qwerty", "letmein"];

type Env = Record<string, string | undefined>;

function weaknesses(name: string, value: string | undefined, min: number): string[] {
  if (!value || !value.trim()) return [`falta ${name}`];
  const v = value.trim(), problems: string[] = [];
  if (v.length < min) problems.push(`${name} ha de tenir almenys ${min} caràcters (en té ${v.length})`);
  if (KNOWN.some(k => v.toLowerCase().includes(k)) || ["admin", "secret", "clau", "test", "prova"].includes(v.toLowerCase())) problems.push(`${name} és un valor conegut o previsible`);
  if (new Set(v).size < 6) problems.push(`${name} té massa pocs caràcters diferents`);
  return problems;
}

/**
 * Només el servidor de prova local pot desactivar la comprovació (GATE_ALLOW_WEAK=1). A Vercel la variable VERCEL sempre hi és
 * i el senyal s'ignora, de manera que no es pot aixecar la protecció per error en un desplegament real.
 */
export function weakAllowed(env: Env): boolean {
  return env.GATE_ALLOW_WEAK === "1" && !env.VERCEL;
}

export function adminKeyProblems(env: Env): string[] {
  if (weakAllowed(env)) return env.ADMIN_KEY ? [] : ["falta ADMIN_KEY"];
  const problems = weaknesses("ADMIN_KEY", env.ADMIN_KEY, MIN_ADMIN_KEY);
  if (env.ADMIN_KEY && env.GATE_SECRET && env.ADMIN_KEY.trim() === env.GATE_SECRET.trim()) problems.push("ADMIN_KEY i GATE_SECRET han de ser valors diferents");
  return problems;
}

export function gateSecretProblems(env: Env): string[] {
  if (weakAllowed(env)) return env.GATE_SECRET ? [] : ["falta GATE_SECRET"];
  return weaknesses("GATE_SECRET", env.GATE_SECRET, MIN_GATE_SECRET);
}

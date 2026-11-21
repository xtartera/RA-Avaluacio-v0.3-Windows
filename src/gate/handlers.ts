import {clampDays, DAYS_KEY, findByKey, lastKey, newPerson, parseState, personKey, publicList, regenerateKey, sessionDays} from "./access.ts";
import {adminKeyProblems, gateSecretProblems} from "./config.ts";
import {safeEqual} from "./crypto.ts";
import {clearCookie, parseCookies, SESSION_COOKIE, sessionCookie, signSession, verifySession} from "./session.ts";
import type {GateStore, StoreOp} from "./store.ts";

export interface GateEnv {
  /** El porter només actua si val «1»: sense això, tothom passa (interruptor per desplegar-lo sense efecte). */
  GATE_ENABLED?: string;
  /** Secret per signar les sessions. */
  GATE_SECRET?: string;
  /** Clau del panell d'administració. */
  ADMIN_KEY?: string;
  [key: string]: string | undefined;
}

export interface GateDeps {
  env: GateEnv;
  store: GateStore;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

/** Pàgines que es poden obrir sense sessió: l'entrada i el panell (que demana la seva pròpia clau). */
const PUBLIC_PATHS = new Set(["/acces.html", "/admin.html", "/api/entra", "/api/surt", "/favicon.ico"]);
const isPublic = (path: string) => PUBLIC_PATHS.has(path) || path === "/api/admin" || path.startsWith("/api/admin/");
const defaultSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const FAIL_DELAY_MS = 500;

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {status, headers: {"content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers}});
const redirect = (location: string, cookie?: string) =>
  new Response(null, {status: 302, headers: {location, "cache-control": "no-store", ...(cookie ? {"set-cookie": cookie} : {})}});
const plain = (message: string, status: number) =>
  new Response(message, {status, headers: {"content-type": "text/plain; charset=utf-8", "cache-control": "no-store"}});

/**
 * Decideix si una petició pot continuar. Retorna null si pot passar i una resposta si no (redirecció a l'entrada, 401 o 503).
 * Cada petició comprova que la persona continua autoritzada, així que revocar un accés s'aplica al moment.
 */
export async function gate(request: Request, deps: GateDeps): Promise<Response | null> {
  const {env, store} = deps;
  if (env.GATE_ENABLED !== "1") return null;
  const url = new URL(request.url);
  if (isPublic(url.pathname)) return null;
  const weakSecret = gateSecretProblems(env);
  if (weakSecret.length) return plain(`Porter mal configurat: ${weakSecret.join("; ")}.`, 503);

  const now = (deps.now ?? Date.now)();
  const token = parseCookies(request.headers.get("cookie"))[SESSION_COOKIE];
  const navigation = request.method === "GET" || request.method === "HEAD";
  const deny = (clear: boolean) => navigation
    ? redirect(`/acces.html?torna=${encodeURIComponent(url.pathname + url.search)}`, clear ? clearCookie() : undefined)
    : json({error: "Cal iniciar sessió."}, 401, clear ? {"set-cookie": clearCookie()} : {});

  const session = await verifySession(token, env.GATE_SECRET!, now);
  if (!session) return deny(Boolean(token));
  let state;
  try {
    state = parseState(await store.readAll());
  } catch {
    return plain("No es pot comprovar l'accés ara mateix. Torna-ho a provar d'aquí a un moment.", 503);
  }
  const person = state.persones[session.p];
  if (!person || !person.actiu) return deny(true);
  return null;
}

/** Entrada: rep la clau, i si és d'una persona activa obre una sessió de N dies en aquest dispositiu. */
export async function login(request: Request, deps: GateDeps): Promise<Response> {
  if (request.method !== "POST") return json({error: "Mètode no permès."}, 405);
  if (gateSecretProblems(deps.env).length) return json({error: "Porter mal configurat."}, 503);
  let body: {clau?: unknown};
  try { body = await request.json(); } catch { return json({error: "Petició no vàlida."}, 400); }
  let state;
  try {
    state = parseState(await deps.store.readAll());
  } catch {
    return json({error: "No es pot comprovar l'accés ara mateix."}, 503);
  }
  const found = await findByKey(state, typeof body?.clau === "string" ? body.clau : "");
  if (!found) {
    await (deps.sleep ?? defaultSleep)(FAIL_DELAY_MS); // alenteix qui provi claus a l'atzar
    return json({error: "Clau no vàlida o sense accés."}, 401);
  }
  const now = (deps.now ?? Date.now)(), days = sessionDays(state, found.person);
  const token = await signSession({p: found.id, iat: now, exp: now + days * 86_400_000}, deps.env.GATE_SECRET!);
  try { await deps.store.apply([{operation: "upsert", key: lastKey(found.id), value: new Date(now).toISOString()}]); } catch { /* l'últim accés és informatiu */ }
  return json({ok: true, dies: days}, 200, {"set-cookie": sessionCookie(token, days)});
}

export function logout(): Response {
  return redirect("/acces.html", clearCookie());
}

const ID = /^[0-9a-f]{8}$/;

/** Panell d'administració (llista, alta, canvis, baixa i dies per defecte). Totes les crides porten la clau d'administrador. */
export async function admin(request: Request, deps: GateDeps): Promise<Response> {
  const {env, store} = deps;
  const weakAdmin = adminKeyProblems(env);
  if (weakAdmin.length) return json({error: `Configuració no segura: ${weakAdmin.join("; ")}. El panell queda tancat fins que es corregeixi a Vercel.`}, 503);
  if (!safeEqual(request.headers.get("x-admin-key") ?? "", env.ADMIN_KEY ?? "")) {
    await (deps.sleep ?? defaultSleep)(FAIL_DELAY_MS);
    return json({error: "Clau d'administrador incorrecta."}, 401);
  }
  const now = new Date((deps.now ?? Date.now)());
  try {
    const state = parseState(await store.readAll());
    if (request.method === "GET") return json({dies: state.dies, persones: publicList(state)});
    if (!["POST", "PATCH", "DELETE", "PUT"].includes(request.method)) return json({error: "Mètode no permès."}, 405);

    let body: Record<string, unknown> = {};
    try { body = (await request.json()) as Record<string, unknown>; } catch { return json({error: "Petició no vàlida."}, 400); }
    const id = typeof body.id === "string" ? body.id : "";

    if (request.method === "POST" && body.accio === "regenera") {
      const person = state.persones[id];
      if (!ID.test(id) || !person) return json({error: "No existeix aquesta persona."}, 404);
      const {key, hash} = await regenerateKey();
      await store.apply([{operation: "upsert", key: personKey(id), value: {...person, hash}}]);
      return json({id, clau: key});
    }
    if (request.method === "POST") {
      const nom = typeof body.nom === "string" ? body.nom.trim() : "";
      if (!nom || nom.length > 60) return json({error: "Cal un nom (màxim 60 caràcters)."}, 400);
      const created = await newPerson(nom, body.dies == null || body.dies === "" ? null : clampDays(body.dies), now);
      await store.apply([{operation: "upsert", key: personKey(created.id), value: created.person}]);
      return json({id: created.id, nom, clau: created.key, dies: created.person.dies}, 201);
    }
    if (request.method === "PATCH") {
      const person = state.persones[id];
      if (!ID.test(id) || !person) return json({error: "No existeix aquesta persona."}, 404);
      const next = {...person};
      if (typeof body.nom === "string") { const nom = body.nom.trim(); if (!nom || nom.length > 60) return json({error: "Nom no vàlid."}, 400); next.nom = nom; }
      if (typeof body.actiu === "boolean") next.actiu = body.actiu;
      if ("dies" in body) next.dies = body.dies == null || body.dies === "" ? null : clampDays(body.dies);
      await store.apply([{operation: "upsert", key: personKey(id), value: next}]);
      return json({ok: true});
    }
    if (request.method === "DELETE") {
      if (!ID.test(id) || !state.persones[id]) return json({error: "No existeix aquesta persona."}, 404);
      const ops: StoreOp[] = [{operation: "delete", key: personKey(id)}];
      if (state.ultim[id]) ops.push({operation: "delete", key: lastKey(id)});
      await store.apply(ops);
      return json({ok: true});
    }
    if (request.method === "PUT") {
      const dies = clampDays(body.dies, NaN);
      if (!Number.isFinite(dies)) return json({error: "Els dies han de ser un nombre entre 1 i 365."}, 400);
      await store.apply([{operation: "upsert", key: DAYS_KEY, value: dies}]);
      return json({ok: true, dies});
    }
    return json({error: "Mètode no permès."}, 405);
  } catch (error) {
    return json({error: error instanceof Error ? error.message : "Error intern."}, 500);
  }
}

// GENERAT per scripts/build-gate.mjs a partir de src/gate: no s'edita a mà (npm run gate:build).
const encoder = new TextEncoder();
const toHex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function sha256Hex(text) {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}
async function hmacHex(secret, data) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}
function safeEqual(a, b) {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomKey(groups = 6, size = 4) {
  const bytes = crypto.getRandomValues(new Uint8Array(groups * size));
  const symbols = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]);
  const out = [];
  for (let i = 0; i < groups; i++) out.push(symbols.slice(i * size, (i + 1) * size).join(""));
  return out.join("-");
}
function randomId() {
  return toHex(crypto.getRandomValues(new Uint8Array(4)).buffer);
}
function normalizeKey(key) {
  return key.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function base64urlEncode(text) {
  const bytes = encoder.encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64urlDecode(text) {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - text.length % 4) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}
const DEFAULT_DAYS = 30, MIN_DAYS = 1, MAX_DAYS = 365;
const personKey = (id) => `p_${id}`;
const lastKey = (id) => `u_${id}`;
const DAYS_KEY = "dies";
function clampDays(value, fallback = DEFAULT_DAYS) {
  const n = Number(value);
  return Number.isFinite(n) && value !== null && value !== "" ? Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(n))) : fallback;
}
function parseState(items) {
  const state = { dies: clampDays(items[DAYS_KEY]), persones: {}, ultim: {} };
  for (const [key, value] of Object.entries(items)) {
    if (key.startsWith("p_") && value && typeof value === "object") {
      const p = value;
      if (typeof p.nom === "string" && typeof p.hash === "string") {
        state.persones[key.slice(2)] = { nom: p.nom, hash: p.hash, actiu: p.actiu !== false, dies: p.dies == null ? null : clampDays(p.dies), creat: typeof p.creat === "string" ? p.creat : "" };
      }
    } else if (key.startsWith("u_") && typeof value === "string") state.ultim[key.slice(2)] = value;
  }
  return state;
}
function sessionDays(state, person) {
  return person.dies ?? state.dies;
}
async function findByKey(state, key) {
  const normalized = normalizeKey(key);
  if (normalized.length < 16) return null;
  const hash = await sha256Hex(normalized);
  let found = null;
  for (const [id, person] of Object.entries(state.persones)) if (safeEqual(person.hash, hash) && person.actiu) found = { id, person };
  return found;
}
async function newPerson(nom, dies, now) {
  const key = randomKey();
  return { id: randomId(), key, person: { nom: nom.trim(), hash: await sha256Hex(normalizeKey(key)), actiu: true, dies: dies === null ? null : clampDays(dies), creat: now.toISOString() } };
}
async function regenerateKey() {
  const key = randomKey();
  return { key, hash: await sha256Hex(normalizeKey(key)) };
}
function publicList(state) {
  return Object.entries(state.persones).map(([id, p]) => ({ id, nom: p.nom, actiu: p.actiu, dies: p.dies, creat: p.creat, ultimAcces: state.ultim[id] ?? null })).sort((a, b) => a.nom.localeCompare(b.nom, "ca"));
}
const MIN_ADMIN_KEY = 16;
const MIN_GATE_SECRET = 32;
const KNOWN = ["admin-local", "secret-de-prova", "password", "contrasenya", "changeme", "canvia-ho", "12345678", "qwerty", "letmein"];
function weaknesses(name, value, min) {
  if (!value || !value.trim()) return [`falta ${name}`];
  const v = value.trim(), problems = [];
  if (v.length < min) problems.push(`${name} ha de tenir almenys ${min} caràcters (en té ${v.length})`);
  if (KNOWN.some((k) => v.toLowerCase().includes(k)) || ["admin", "secret", "clau", "test", "prova"].includes(v.toLowerCase())) problems.push(`${name} és un valor conegut o previsible`);
  if (new Set(v).size < 6) problems.push(`${name} té massa pocs caràcters diferents`);
  return problems;
}
function weakAllowed(env) {
  return env.GATE_ALLOW_WEAK === "1" && !env.VERCEL;
}
function adminKeyProblems(env) {
  if (weakAllowed(env)) return env.ADMIN_KEY ? [] : ["falta ADMIN_KEY"];
  const problems = weaknesses("ADMIN_KEY", env.ADMIN_KEY, MIN_ADMIN_KEY);
  if (env.ADMIN_KEY && env.GATE_SECRET && env.ADMIN_KEY.trim() === env.GATE_SECRET.trim()) problems.push("ADMIN_KEY i GATE_SECRET han de ser valors diferents");
  return problems;
}
function gateSecretProblems(env) {
  if (weakAllowed(env)) return env.GATE_SECRET ? [] : ["falta GATE_SECRET"];
  return weaknesses("GATE_SECRET", env.GATE_SECRET, MIN_GATE_SECRET);
}
const SESSION_COOKIE = "sessio";
async function signSession(payload, secret) {
  const body = base64urlEncode(JSON.stringify(payload));
  return `${body}.${await hmacHex(secret, body)}`;
}
async function verifySession(token, secret, now) {
  if (!token || !secret) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot), signature = token.slice(dot + 1);
  if (!safeEqual(signature, await hmacHex(secret, body))) return null;
  try {
    const payload = JSON.parse(base64urlDecode(body));
    if (typeof payload.p !== "string" || typeof payload.exp !== "number" || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}
function parseCookies(header) {
  const out = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}
function sessionCookie(token, days) {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${Math.round(days * 86400)}; HttpOnly; Secure; SameSite=Lax`;
}
function clearCookie() {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
const PUBLIC_PATHS = /* @__PURE__ */ new Set(["/acces.html", "/admin.html", "/api/entra", "/api/surt", "/favicon.ico"]);
const isPublic = (path) => PUBLIC_PATHS.has(path) || path === "/api/admin" || path.startsWith("/api/admin/");
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const FAIL_DELAY_MS = 500;
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const redirect = (location, cookie) => new Response(null, { status: 302, headers: { location, "cache-control": "no-store", ...cookie ? { "set-cookie": cookie } : {} } });
const plain = (message, status) => new Response(message, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
async function gate(request, deps) {
  const { env, store } = deps;
  if (env.GATE_ENABLED !== "1") return null;
  const url = new URL(request.url);
  if (isPublic(url.pathname)) return null;
  const weakSecret = gateSecretProblems(env);
  if (weakSecret.length) return plain(`Porter mal configurat: ${weakSecret.join("; ")}.`, 503);
  const now = (deps.now ?? Date.now)();
  const token = parseCookies(request.headers.get("cookie"))[SESSION_COOKIE];
  const navigation = request.method === "GET" || request.method === "HEAD";
  const deny = (clear) => navigation ? redirect(`/acces.html?torna=${encodeURIComponent(url.pathname + url.search)}`, clear ? clearCookie() : void 0) : json({ error: "Cal iniciar sessió." }, 401, clear ? { "set-cookie": clearCookie() } : {});
  const session = await verifySession(token, env.GATE_SECRET, now);
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
async function login(request, deps) {
  if (request.method !== "POST") return json({ error: "Mètode no permès." }, 405);
  if (gateSecretProblems(deps.env).length) return json({ error: "Porter mal configurat." }, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Petició no vàlida." }, 400);
  }
  let state;
  try {
    state = parseState(await deps.store.readAll());
  } catch {
    return json({ error: "No es pot comprovar l'accés ara mateix." }, 503);
  }
  const found = await findByKey(state, typeof body?.clau === "string" ? body.clau : "");
  if (!found) {
    await (deps.sleep ?? defaultSleep)(FAIL_DELAY_MS);
    return json({ error: "Clau no vàlida o sense accés." }, 401);
  }
  const now = (deps.now ?? Date.now)(), days = sessionDays(state, found.person);
  const token = await signSession({ p: found.id, iat: now, exp: now + days * 864e5 }, deps.env.GATE_SECRET);
  try {
    await deps.store.apply([{ operation: "upsert", key: lastKey(found.id), value: new Date(now).toISOString() }]);
  } catch {
  }
  return json({ ok: true, dies: days }, 200, { "set-cookie": sessionCookie(token, days) });
}
function logout() {
  return redirect("/acces.html", clearCookie());
}
const ID = /^[0-9a-f]{8}$/;
async function admin(request, deps) {
  const { env, store } = deps;
  const weakAdmin = adminKeyProblems(env);
  if (weakAdmin.length) return json({ error: `Configuració no segura: ${weakAdmin.join("; ")}. El panell queda tancat fins que es corregeixi a Vercel.` }, 503);
  if (!safeEqual(request.headers.get("x-admin-key") ?? "", env.ADMIN_KEY ?? "")) {
    await (deps.sleep ?? defaultSleep)(FAIL_DELAY_MS);
    return json({ error: "Clau d'administrador incorrecta." }, 401);
  }
  const now = new Date((deps.now ?? Date.now)());
  try {
    const state = parseState(await store.readAll());
    if (request.method === "GET") return json({ dies: state.dies, persones: publicList(state) });
    if (!["POST", "PATCH", "DELETE", "PUT"].includes(request.method)) return json({ error: "Mètode no permès." }, 405);
    let body = {};
    try {
      body = await request.json();
    } catch {
      return json({ error: "Petició no vàlida." }, 400);
    }
    const id = typeof body.id === "string" ? body.id : "";
    if (request.method === "POST" && body.accio === "regenera") {
      const person = state.persones[id];
      if (!ID.test(id) || !person) return json({ error: "No existeix aquesta persona." }, 404);
      const { key, hash } = await regenerateKey();
      await store.apply([{ operation: "upsert", key: personKey(id), value: { ...person, hash } }]);
      return json({ id, clau: key });
    }
    if (request.method === "POST") {
      const nom = typeof body.nom === "string" ? body.nom.trim() : "";
      if (!nom || nom.length > 60) return json({ error: "Cal un nom (màxim 60 caràcters)." }, 400);
      const created = await newPerson(nom, body.dies == null || body.dies === "" ? null : clampDays(body.dies), now);
      await store.apply([{ operation: "upsert", key: personKey(created.id), value: created.person }]);
      return json({ id: created.id, nom, clau: created.key, dies: created.person.dies }, 201);
    }
    if (request.method === "PATCH") {
      const person = state.persones[id];
      if (!ID.test(id) || !person) return json({ error: "No existeix aquesta persona." }, 404);
      const next = { ...person };
      if (typeof body.nom === "string") {
        const nom = body.nom.trim();
        if (!nom || nom.length > 60) return json({ error: "Nom no vàlid." }, 400);
        next.nom = nom;
      }
      if (typeof body.actiu === "boolean") next.actiu = body.actiu;
      if ("dies" in body) next.dies = body.dies == null || body.dies === "" ? null : clampDays(body.dies);
      await store.apply([{ operation: "upsert", key: personKey(id), value: next }]);
      return json({ ok: true });
    }
    if (request.method === "DELETE") {
      if (!ID.test(id) || !state.persones[id]) return json({ error: "No existeix aquesta persona." }, 404);
      const ops = [{ operation: "delete", key: personKey(id) }];
      if (state.ultim[id]) ops.push({ operation: "delete", key: lastKey(id) });
      await store.apply(ops);
      return json({ ok: true });
    }
    if (request.method === "PUT") {
      const dies = clampDays(body.dies, NaN);
      if (!Number.isFinite(dies)) return json({ error: "Els dies han de ser un nombre entre 1 i 365." }, 400);
      await store.apply([{ operation: "upsert", key: DAYS_KEY, value: dies }]);
      return json({ ok: true, dies });
    }
    return json({ error: "Mètode no permès." }, 405);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error intern." }, 500);
  }
}
async function apiMessage(response) {
  try {
    const body = await response.clone().json();
    const text = body.error?.message ?? body.error?.code;
    return text ? `: ${String(text).slice(0, 160)}` : "";
  } catch {
    return "";
  }
}
function edgeConfigStore(env, fetchFn = fetch, ttlMs = 4e3, clock = Date.now) {
  let cache = null;
  const connection = () => {
    const text = env.GLOBAL_CONFIG || env.EDGE_CONFIG;
    if (!text) throw new Error("Falta la variable GLOBAL_CONFIG (o EDGE_CONFIG): la cadena de connexió del Global Config enllaçat al projecte.");
    let url;
    try {
      url = new URL(text);
    } catch {
      throw new Error("La cadena de connexió del Global Config no és vàlida.");
    }
    const id = url.pathname.split("/")[1] ?? "";
    const token = url.searchParams.get("token") ?? "";
    if (!id || !token) throw new Error("La cadena de connexió del Global Config no és vàlida (falta l'identificador o la clau).");
    return { base: `${url.origin}/${id}`, token, id: env.GLOBAL_CONFIG_ID || env.EDGE_CONFIG_ID || id };
  };
  return {
    async readAll() {
      if (cache && clock() - cache.at < ttlMs) return cache.items;
      const { base, token } = connection();
      const response = await fetchFn(`${base}/items?version=1`, { headers: { authorization: `Bearer ${token}`, "cache-control": "no-cache" } });
      if (!response.ok) throw new Error(`No s'ha pogut llegir el Global Config (${response.status}).`);
      const items = await response.json();
      cache = { at: clock(), items };
      return items;
    },
    async apply(ops) {
      if (!ops.length) return;
      if (!env.VERCEL_API_TOKEN) throw new Error("Falta la variable VERCEL_API_TOKEN (necessària per escriure al Global Config).");
      const { id } = connection();
      const scope = env.VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(env.VERCEL_TEAM_ID)}` : env.VERCEL_TEAM_SLUG ? `?slug=${encodeURIComponent(env.VERCEL_TEAM_SLUG)}` : "";
      const urls = [`https://api.vercel.com/v1/edge-config/${id}/items${scope}`, `https://api.vercel.com/v1/global-config/${id}/items${scope}`];
      const failures = [];
      cache = null;
      for (const url of urls) {
        const response = await fetchFn(url, {
          method: "PATCH",
          headers: { authorization: `Bearer ${env.VERCEL_API_TOKEN}`, "content-type": "application/json" },
          body: JSON.stringify({ items: ops })
        });
        if (response.ok) return;
        failures.push(`${response.status}${await apiMessage(response)}`);
        if (response.status !== 404) break;
      }
      throw new Error(`No s'ha pogut escriure al Global Config (${failures.join(" / ")}).`);
    }
  };
}
export {
  admin,
  edgeConfigStore,
  gate,
  login,
  logout
};

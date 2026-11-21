import assert from "node:assert/strict";
import {test} from "node:test";
import {clampDays, findByKey, parseState, publicList} from "../src/gate/access.ts";
import {adminKeyProblems, gateSecretProblems, weakAllowed} from "../src/gate/config.ts";
import {base64urlDecode, base64urlEncode, hmacHex, normalizeKey, randomKey, safeEqual, sha256Hex} from "../src/gate/crypto.ts";
import {admin, gate, login, logout, type GateDeps} from "../src/gate/handlers.ts";
import {clearCookie, parseCookies, sessionCookie, signSession, verifySession} from "../src/gate/session.ts";
import {edgeConfigStore, type GateStore, type StoreOp} from "../src/gate/store.ts";

/** Magatzem en memòria: fa el mateix que l'Edge Config (tot o res en cada lot). */
function memoryStore(initial: Record<string, unknown> = {}): GateStore & {items: Record<string, unknown>; fail: boolean} {
  const store = {
    items: {...initial}, fail: false,
    async readAll() { if (store.fail) throw new Error("caigut"); return structuredClone(store.items); },
    async apply(ops: StoreOp[]) { if (store.fail) throw new Error("caigut"); for (const op of ops) { if (op.operation === "delete") delete store.items[op.key]; else store.items[op.key] = structuredClone(op.value); } }
  };
  return store;
}
const NOW = Date.UTC(2026, 10, 21, 12, 0, 0);
const sleepNone = async () => {};
function deps(store = memoryStore(), env: GateDeps["env"] = {}): GateDeps & {store: ReturnType<typeof memoryStore>} {
  return {env: {GATE_ENABLED: "1", GATE_SECRET: "secret-de-prova", ADMIN_KEY: "clau-admin", GATE_ALLOW_WEAK: "1", ...env}, store, now: () => NOW, sleep: sleepNone} as GateDeps & {store: ReturnType<typeof memoryStore>};
}
const call = (handler: (r: Request, d: GateDeps) => Promise<Response>, d: GateDeps, method: string, body?: unknown, headers: Record<string, string> = {}) =>
  handler(new Request("https://app.example/api/x", {method, headers: {"content-type": "application/json", ...headers}, body: body === undefined ? undefined : JSON.stringify(body)}), d);
const adminCall = (d: GateDeps, method: string, body?: unknown) => call(admin, d, method, body, {"x-admin-key": "clau-admin"});

async function createPerson(d: GateDeps, nom = "Anna", dies?: number) {
  const r = await adminCall(d, "POST", {nom, dies});
  assert.equal(r.status, 201);
  return (await r.json()) as {id: string; clau: string; nom: string; dies: number | null};
}
const get = (d: GateDeps, path: string, cookie?: string) => gate(new Request(`https://app.example${path}`, {headers: cookie ? {cookie} : {}}), d);
const cookieOf = (r: Response) => (r.headers.get("set-cookie") ?? "").split(";")[0];

test("criptografia: claus llegibles i úniques, hash estable i comparació en temps constant", async () => {
  const k = randomKey();
  assert.match(k, /^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){5}$/);
  assert.notEqual(k, randomKey());
  assert.equal(normalizeKey(" k7qm-2xwd "), "K7QM2XWD");
  assert.equal(await sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal((await hmacHex("k", "d")).length, 64);
  assert.ok(safeEqual("abc", "abc") && !safeEqual("abc", "abd") && !safeEqual("abc", "abcd"));
  assert.equal(base64urlDecode(base64urlEncode("Núria · ç ñ")), "Núria · ç ñ");
});

test("sessió: signada, caduca i detecta qualsevol manipulació", async () => {
  const token = await signSession({p: "ab12cd34", iat: NOW, exp: NOW + 1000}, "s");
  assert.deepEqual((await verifySession(token, "s", NOW))?.p, "ab12cd34");
  assert.equal(await verifySession(token, "s", NOW + 1001), null, "caducada");
  assert.equal(await verifySession(token, "altre-secret", NOW), null, "secret diferent");
  const [body, sig] = token.split(".");
  const forged = base64urlEncode(JSON.stringify({p: "ab12cd34", iat: NOW, exp: NOW + 9e12}));
  assert.equal(await verifySession(`${forged}.${sig}`, "s", NOW), null, "càrrega canviada");
  assert.equal(await verifySession(`${body}.${"0".repeat(64)}`, "s", NOW), null);
  assert.equal(await verifySession("sense-punt", "s", NOW), null);
  assert.equal(await verifySession(undefined, "s", NOW), null);
  assert.match(sessionCookie("t", 30), /Max-Age=2592000; HttpOnly; Secure; SameSite=Lax/);
  assert.match(clearCookie(), /Max-Age=0/);
  assert.deepEqual(parseCookies("a=1; sessio=xx.yy; b=2"), {a: "1", sessio: "xx.yy", b: "2"});
});

test("el porter està apagat sense GATE_ENABLED=1: tothom passa", async () => {
  assert.equal(await get(deps(memoryStore(), {GATE_ENABLED: undefined}), "/"), null);
  assert.equal(await get(deps(memoryStore(), {GATE_ENABLED: "0"}), "/assets/app.js"), null);
});

test("encès: sense sessió es redirigeix a l'entrada; l'entrada i el panell són accessibles", async () => {
  const d = deps();
  const r = (await get(d, "/informes?x=1"))!;
  assert.equal(r.status, 302);
  assert.equal(r.headers.get("location"), "/acces.html?torna=%2Finformes%3Fx%3D1");
  for (const path of ["/acces.html", "/admin.html", "/api/entra", "/api/surt", "/api/admin", "/favicon.ico"]) assert.equal(await get(d, path), null, path);
  const post = await gate(new Request("https://app.example/api/dades", {method: "POST"}), d);
  assert.equal(post!.status, 401, "una petició que no és de navegació rep 401, no una redirecció");
});

test("encès sense secret o amb el magatzem caigut: es tanca (mai no deixa passar per error)", async () => {
  const noSecret = (await get(deps(memoryStore(), {GATE_SECRET: undefined}), "/"))!;
  assert.equal(noSecret.status, 503);
  const d = deps(); const p = await createPerson(d);
  const {headers} = await call(login, d, "POST", {clau: p.clau});
  d.store.fail = true;
  assert.equal((await get(d, "/", cookieOf(await call(login, deps(memoryStore({[`p_${p.id}`]: d.store.items[`p_${p.id}`]})), "POST", {clau: p.clau}))))!.status, 503);
  assert.ok(headers.get("set-cookie"));
});

test("flux complet: l'administrador crea una clau, la persona entra i l'app s'obre", async () => {
  const d = deps();
  const p = await createPerson(d, "Anna Puig");
  assert.match(p.clau, /^[A-Z2-9-]{29}$/);
  const entry = await call(login, d, "POST", {clau: p.clau.toLowerCase().replace(/-/g, " ")});
  assert.equal(entry.status, 200, "la clau s'accepta escrita de qualsevol manera");
  const cookie = cookieOf(entry);
  assert.equal(await get(d, "/", cookie), null, "amb la galeta passa");
  assert.equal(await get(d, "/assets/index.js", cookie), null);
  assert.ok(d.store.items[`u_${p.id}`], "es registra l'últim accés");
  assert.match(entry.headers.get("set-cookie")!, /Max-Age=2592000/, "30 dies per defecte");
  assert.equal((await get(d, "/"))!.status, 302, "sense galeta no");
});

test("una clau incorrecta o buida no entra", async () => {
  const d = deps(); await createPerson(d);
  for (const clau of ["", "ABCD", "AAAA-BBBB-CCCC-DDDD-EEEE-FFFF", 123 as unknown as string]) {
    const r = await call(login, d, "POST", {clau});
    assert.equal(r.status, 401, String(clau));
    assert.equal(r.headers.get("set-cookie"), null);
  }
  assert.equal((await call(login, d, "GET")).status, 405);
  assert.equal((await login(new Request("https://x/api/entra", {method: "POST", body: "no és json"}), d)).status, 400);
});

test("revocar un accés tanca la sessió al moment; tornar-lo a activar la reobre", async () => {
  const d = deps(); const p = await createPerson(d);
  const cookie = cookieOf(await call(login, d, "POST", {clau: p.clau}));
  assert.equal(await get(d, "/", cookie), null);
  assert.equal((await adminCall(d, "PATCH", {id: p.id, actiu: false})).status, 200);
  const denied = (await get(d, "/", cookie))!;
  assert.equal(denied.status, 302);
  assert.match(denied.headers.get("set-cookie")!, /Max-Age=0/, "es neteja la galeta");
  assert.equal((await call(login, d, "POST", {clau: p.clau})).status, 401, "ni amb la clau");
  await adminCall(d, "PATCH", {id: p.id, actiu: true});
  assert.equal(await get(d, "/", cookie), null, "reactivat: la mateixa sessió torna a servir");
});

test("regenerar la clau invalida l'antiga però no les sessions obertes; eliminar-la talla tot", async () => {
  const d = deps(); const p = await createPerson(d);
  const cookie = cookieOf(await call(login, d, "POST", {clau: p.clau}));
  const regen = await (await adminCall(d, "POST", {accio: "regenera", id: p.id})).json() as {clau: string};
  assert.notEqual(regen.clau, p.clau);
  assert.equal((await call(login, d, "POST", {clau: p.clau})).status, 401, "la clau vella ja no entra");
  assert.equal((await call(login, d, "POST", {clau: regen.clau})).status, 200);
  assert.equal((await adminCall(d, "DELETE", {id: p.id})).status, 200);
  assert.equal((await get(d, "/", cookie))!.status, 302, "esborrada: la sessió deixa de servir");
  assert.equal(d.store.items[`p_${p.id}`], undefined);
  assert.equal(d.store.items[`u_${p.id}`], undefined);
});

test("dies de sessió: per defecte, per persona i configurables; sempre entre 1 i 365", async () => {
  const d = deps();
  const a = await createPerson(d, "A"), b = await createPerson(d, "B", 7);
  assert.match((await call(login, d, "POST", {clau: a.clau})).headers.get("set-cookie")!, /Max-Age=2592000/);
  assert.match((await call(login, d, "POST", {clau: b.clau})).headers.get("set-cookie")!, /Max-Age=604800/, "7 dies només per a B");
  assert.equal((await adminCall(d, "PUT", {dies: 90})).status, 200);
  assert.match((await call(login, d, "POST", {clau: a.clau})).headers.get("set-cookie")!, /Max-Age=7776000/, "el nou valor general");
  assert.equal((await adminCall(d, "PATCH", {id: b.id, dies: null})).status, 200);
  assert.match((await call(login, d, "POST", {clau: b.clau})).headers.get("set-cookie")!, /Max-Age=7776000/, "sense valor propi, usa el general");
  assert.equal((await adminCall(d, "PUT", {dies: 0})).status, 200);
  assert.equal(parseState(d.store.items).dies, 1);
  assert.equal((await adminCall(d, "PUT", {dies: "x"})).status, 400);
  assert.equal(clampDays(9999), 365); assert.equal(clampDays(undefined), 30);
});

test("l'administració exigeix la seva clau, no revela cap hash i valida les dades", async () => {
  const d = deps();
  assert.equal((await call(admin, d, "GET")).status, 401);
  assert.equal((await call(admin, d, "GET", undefined, {"x-admin-key": "una altra"})).status, 401);
  assert.equal((await call(admin, deps(memoryStore(), {ADMIN_KEY: undefined}), "GET", undefined, {"x-admin-key": ""})).status, 503);
  const p = await createPerson(d, "  Joan Roca  ");
  assert.equal(p.nom, "Joan Roca");
  const list = await (await adminCall(d, "GET")).json() as {dies: number; persones: Record<string, unknown>[]};
  assert.equal(list.persones.length, 1);
  assert.deepEqual(Object.keys(list.persones[0]).sort(), ["actiu", "creat", "dies", "id", "nom", "ultimAcces"]);
  assert.ok(!JSON.stringify(list).includes("hash") && !JSON.stringify(list).includes(p.clau));
  assert.equal((await adminCall(d, "POST", {nom: ""})).status, 400);
  assert.equal((await adminCall(d, "POST", {nom: "x".repeat(61)})).status, 400);
  assert.equal((await adminCall(d, "PATCH", {id: "inexistent"})).status, 404);
  assert.equal((await adminCall(d, "DELETE", {id: "12345678"})).status, 404);
  assert.equal((await adminCall(d, "OPTIONS")).status, 405);
});

test("la clau no es guarda mai: només el seu hash, i es troba sense importar com s'escriu", async () => {
  const d = deps(); const p = await createPerson(d);
  const stored = JSON.stringify(d.store.items);
  assert.ok(!stored.includes(p.clau) && !stored.includes(p.clau.replace(/-/g, "")));
  const state = parseState(d.store.items);
  assert.equal((await findByKey(state, p.clau.replace(/-/g, " ").toLowerCase()))?.id, p.id);
  assert.equal(await findByKey(state, "curt"), null);
  assert.equal(publicList(state)[0].nom, "Anna");
});

test("sortir: neteja la galeta i porta a l'entrada", () => {
  const r = logout();
  assert.equal(r.status, 302);
  assert.equal(r.headers.get("location"), "/acces.html");
  assert.match(r.headers.get("set-cookie")!, /Max-Age=0/);
});

test("Global Config: llegeix amb la clau a la capçalera (com el SDK de Vercel), accepta els dos dominis i les dues variables", async () => {
  const calls: {url: string; init?: RequestInit}[] = [];
  let clock = 0, reads = 0;
  const fakeFetch = (async (url: string, init?: RequestInit) => { calls.push({url, init}); if (init?.method === "PATCH") return new Response("{}", {status: 200}); reads++; return new Response(JSON.stringify({dies: 30}), {status: 200}); }) as unknown as typeof fetch;
  const header = (c: {init?: RequestInit}, name: string) => (c.init!.headers as Record<string, string>)[name];

  // Magatzem nou: variable GLOBAL_CONFIG amb el domini global-config.vercel.com
  const store = edgeConfigStore({GLOBAL_CONFIG: "https://global-config.vercel.com/ecfg_abc?token=tok-1", VERCEL_API_TOKEN: "api", VERCEL_TEAM_ID: "team_9"}, fakeFetch, 4000, () => clock);
  assert.deepEqual(await store.readAll(), {dies: 30});
  assert.equal(calls[0].url, "https://global-config.vercel.com/ecfg_abc/items?version=1");
  assert.equal(header(calls[0], "authorization"), "Bearer tok-1", "la clau va a la capçalera, no a l'adreça");
  assert.ok(!calls[0].url.includes("tok-1"));
  clock = 1000; await store.readAll(); assert.equal(reads, 1, "la segona lectura va de la memòria");
  clock = 5000; await store.readAll(); assert.equal(reads, 2, "passats els segons, torna a llegir");
  await store.apply([{operation: "upsert", key: "dies", value: 7}, {operation: "delete", key: "p_1"}]);
  const patch = calls.at(-1)!;
  assert.equal(patch.url, "https://api.vercel.com/v1/edge-config/ecfg_abc/items?teamId=team_9");
  assert.equal(header(patch, "authorization"), "Bearer api");
  assert.deepEqual(JSON.parse(patch.init!.body as string), {items: [{operation: "update", key: "dies", value: 7}, {operation: "delete", key: "p_1"}]}, "«upsert» sobre una clau que existeix s'envia com a update");
  assert.equal(reads, 3, "abans d'escriure es llegeix què hi ha");
  await store.readAll(); assert.equal(reads, 4, "escriure invalida la memòria");

  // Magatzem antic: variable EDGE_CONFIG amb el domini edge-config.vercel.com; GLOBAL_CONFIG té prioritat si hi són les dues
  const old = edgeConfigStore({EDGE_CONFIG: "https://edge-config.vercel.com/ecfg_old?token=t-old"}, fakeFetch);
  await old.readAll(); assert.equal(calls.at(-1)!.url, "https://edge-config.vercel.com/ecfg_old/items?version=1");
  const both = edgeConfigStore({GLOBAL_CONFIG: "https://global-config.vercel.com/ecfg_new?token=t-new", EDGE_CONFIG: "https://edge-config.vercel.com/ecfg_old?token=t-old"}, fakeFetch);
  await both.readAll(); assert.equal(calls.at(-1)!.url, "https://global-config.vercel.com/ecfg_new/items?version=1");

  // Errors clars
  await assert.rejects(edgeConfigStore({GLOBAL_CONFIG: "https://global-config.vercel.com/ecfg_abc?token=t"}, fakeFetch).apply([{operation: "delete", key: "x"}]), /VERCEL_API_TOKEN/);
  await assert.rejects(edgeConfigStore({}, fakeFetch).readAll(), /GLOBAL_CONFIG \(o EDGE_CONFIG\)/);
  await assert.rejects(edgeConfigStore({GLOBAL_CONFIG: "no és una adreça"}, fakeFetch).readAll(), /no és vàlida/);
  await assert.rejects(edgeConfigStore({GLOBAL_CONFIG: "https://global-config.vercel.com/ecfg_abc"}, fakeFetch).readAll(), /no és vàlida/);
  const failing = edgeConfigStore({GLOBAL_CONFIG: "https://global-config.vercel.com/ecfg_abc?token=t"}, (async () => new Response("", {status: 500})) as unknown as typeof fetch);
  await assert.rejects(failing.readAll(), /500/);
});

// ---- Comprovació de seguretat de la configuració ----

const STRONG_ADMIN = "k9Qv-Zr3tLx7Pw2Nd8Ya5Hs"; // 24 caràcters
const STRONG_SECRET = "f3b1c9d27a64e0185c2d9a7b6e4f01a3d5c8b2e7";
const strongEnv = {GATE_ENABLED: "1", GATE_SECRET: STRONG_SECRET, ADMIN_KEY: STRONG_ADMIN};
const adminWith = (env: Record<string, string | undefined>, key: string) =>
  admin(new Request("https://app.example/api/admin", {headers: {"x-admin-key": key}}), {env, store: memoryStore(), now: () => NOW, sleep: sleepNone});

test("claus fortes: s'accepten", () => {
  assert.deepEqual(adminKeyProblems(strongEnv), []);
  assert.deepEqual(gateSecretProblems(strongEnv), []);
});

test("una clau d'administrador feble es rebutja: curta, coneguda o amb pocs caràcters diferents", () => {
  assert.match(adminKeyProblems({...strongEnv, ADMIN_KEY: "clau-curta"}).join(), /almenys 16 caràcters/);
  assert.match(adminKeyProblems({...strongEnv, ADMIN_KEY: "admin-local"}).join(), /conegut o previsible/);
  assert.match(adminKeyProblems({...strongEnv, ADMIN_KEY: "Admin-Local-i-més-text-llarg"}).join(), /conegut o previsible/, "també si hi ha text al voltant");
  assert.match(adminKeyProblems({...strongEnv, ADMIN_KEY: "aaaaaaaaaaaaaaaaaaaaaaaa"}).join(), /pocs caràcters diferents/);
  assert.match(adminKeyProblems({...strongEnv, ADMIN_KEY: undefined}).join(), /falta ADMIN_KEY/);
  assert.match(adminKeyProblems({...strongEnv, ADMIN_KEY: STRONG_SECRET.slice(0, 40), GATE_SECRET: STRONG_SECRET.slice(0, 40)}).join(), /han de ser valors diferents/);
  assert.match(gateSecretProblems({...strongEnv, GATE_SECRET: STRONG_ADMIN}).join(), /almenys 32 caràcters/);
});

test("amb la configuració feble, el panell es tanca encara que la clau sigui la correcta, i no revela cap valor", async () => {
  const weak = {...strongEnv, ADMIN_KEY: "admin-local"};
  const r = await adminWith(weak, "admin-local");
  assert.equal(r.status, 503);
  const text = await r.text();
  assert.match(text, /Configuració no segura/);
  assert.ok(!text.includes("admin-local\""), "el missatge no repeteix el valor");
  assert.equal((await adminWith(strongEnv, STRONG_ADMIN)).status, 200, "amb la clau forta, funciona");
  assert.equal((await adminWith(strongEnv, "admin-local")).status, 401, "i admin-local ja no val");
});

test("amb un secret de sessions feble, el porter es tanca (503) i no es poden obrir sessions", async () => {
  const env = {...strongEnv, GATE_SECRET: "massa-curt"};
  const d = {env, store: memoryStore(), now: () => NOW, sleep: sleepNone};
  assert.equal((await gate(new Request("https://app.example/"), d))!.status, 503);
  assert.equal(await gate(new Request("https://app.example/acces.html"), d), null, "l'entrada continua visible");
  assert.equal((await login(new Request("https://app.example/api/entra", {method: "POST", body: JSON.stringify({clau: "X"})}), d)).status, 503);
});

test("només el servidor local es pot saltar la comprovació: a Vercel el senyal s'ignora", async () => {
  const local = {...strongEnv, ADMIN_KEY: "admin-local", GATE_ALLOW_WEAK: "1"};
  assert.ok(weakAllowed(local));
  assert.deepEqual(adminKeyProblems(local), []);
  assert.equal((await adminWith(local, "admin-local")).status, 200, "en local, admin-local funciona");
  const onVercel = {...local, VERCEL: "1"};
  assert.ok(!weakAllowed(onVercel), "a Vercel (VERCEL=1) el senyal no val");
  assert.match(adminKeyProblems(onVercel).join(), /conegut o previsible/);
  assert.equal((await adminWith(onVercel, "admin-local")).status, 503);
  assert.ok(!weakAllowed({...strongEnv}), "sense el senyal, no es permet");
});

test("escriptura al Global Config: create/update segons existeix la clau, equip per nom o identificador, doble adreça i missatge de Vercel", async () => {
  const connection = {GLOBAL_CONFIG: "https://global-config.vercel.com/ecfg_abc?token=t", VERCEL_API_TOKEN: "api"};
  const upsert = (key: string) => [{operation: "upsert" as const, key, value: 7}];
  const patches: {url: string; body: {items: {operation: string; key: string}[]}}[] = [];
  /** El magatzem simulat té la clau «dies»; les PATCH responen amb l'estat indicat (o amb una llista d'estats, una per intent). */
  const fetcher = (status: number | number[], message?: string) => {
    const statuses = [status].flat();
    return (async (url: string, init?: RequestInit) => {
      if (init?.method !== "PATCH") return new Response(JSON.stringify({dies: 30}), {status: 200});
      patches.push({url, body: JSON.parse(init.body as string)});
      const code = statuses[Math.min(patches.length - 1 - patchBase, statuses.length - 1)];
      return new Response(JSON.stringify(code >= 400 && message ? {error: {code: "x", message}} : {}), {status: code});
    }) as unknown as typeof fetch;
  };
  let patchBase = 0;
  const run = async (env: Record<string, string>, fetchFn: typeof fetch, key = "dies") => { patchBase = patches.length; return edgeConfigStore({...connection, ...env}, fetchFn).apply(upsert(key)); };

  // «upsert» → create si la clau és nova i update si ja existeix
  await run({}, fetcher(200), "p_nou");
  assert.equal(patches.at(-1)!.body.items[0].operation, "create");
  await run({}, fetcher(200), "dies");
  assert.equal(patches.at(-1)!.body.items[0].operation, "update");

  // equip per nom o per identificador (l'identificador té prioritat)
  await run({VERCEL_TEAM_SLUG: "xtarteras-projects"}, fetcher(200));
  assert.equal(patches.at(-1)!.url, "https://api.vercel.com/v1/edge-config/ecfg_abc/items?slug=xtarteras-projects");
  await run({VERCEL_TEAM_ID: "team_1", VERCEL_TEAM_SLUG: "x"}, fetcher(200));
  assert.match(patches.at(-1)!.url, /\?teamId=team_1$/);

  // 404 a l'adreça antiga: prova la nova i, si funciona, no falla
  const before = patches.length;
  await run({}, fetcher([404, 200]));
  assert.deepEqual(patches.slice(before).map(p => p.url), ["https://api.vercel.com/v1/edge-config/ecfg_abc/items", "https://api.vercel.com/v1/global-config/ecfg_abc/items"]);

  // 404 a les dues: l'error porta els dos estats i el missatge de Vercel
  const failedFrom = patches.length;
  await assert.rejects(run({}, fetcher(404, "Edge Config Item not found")), /\(404: Edge Config Item not found \/ 404: Edge Config Item not found\)/);
  assert.equal(patches.length - failedFrom, 2);

  // un error que no és 404 no es reintenta
  const forbiddenFrom = patches.length;
  await assert.rejects(run({}, fetcher(403, "Not authorized")), /\(403: Not authorized\)/);
  assert.equal(patches.length - forbiddenFrom, 1);

  // eliminar no es toca: es deixa tal com és
  await edgeConfigStore(connection, fetcher(200)).apply([{operation: "delete", key: "p_1"}]);
  assert.deepEqual(patches.at(-1)!.body.items, [{operation: "delete", key: "p_1"}]);
});

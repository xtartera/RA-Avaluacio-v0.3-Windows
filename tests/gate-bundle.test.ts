import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";
import {test} from "node:test";
import {bundleGate} from "../scripts/build-gate.mjs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("el paquet del porter (gate-dist/gate.mjs) està al dia amb src/gate", async () => {
  const fresh = (await bundleGate() as string).replace(/\r\n/g, "\n");
  assert.equal(read("../gate-dist/gate.mjs"), fresh, "src/gate ha canviat: executa «npm run gate:build» i fes commit del resultat");
});

test("els fitxers que Vercel compila no importen codi .ts de src (error ERR_MODULE_NOT_FOUND a Vercel): només el paquet generat", () => {
  const files = ["../middleware.ts", ...readdirSync(new URL("../api/", import.meta.url)).filter(f => f.endsWith(".ts")).map(f => `../api/${f}`)];
  assert.ok(files.length >= 4);
  for (const file of files) {
    const imports = read(file).split("\n").filter(line => /^\s*import\b/.test(line) && !/^\s*import\s+type\b/.test(line));
    for (const line of imports) assert.ok(/gate-dist\/gate\.mjs"/.test(line), `${file}: import no permès a Vercel → ${line.trim()}`);
  }
});

test("el paquet és autònom: no importa res més (ni fitxers .ts ni paquets)", () => {
  const code = read("../gate-dist/gate.mjs");
  assert.ok(!/^\s*import\s/m.test(code), "gate.mjs no ha de tenir cap import");
  assert.ok(!/require\(/.test(code));
  assert.match(code, /^\/\/ GENERAT per scripts\/build-gate\.mjs/);
});

test("el filtre real (middleware.ts) carregat tal com ho fa Vercel: deixa passar amb el porter apagat i es tanca amb la configuració feble", async () => {
  const saved = {...process.env};
  try {
    const {default: middleware} = await import("../middleware.ts");
    delete process.env.GATE_ENABLED;
    const open = await middleware(new Request("https://app.example/"));
    assert.equal(open.headers.get("x-middleware-next"), "1", "apagat: continua");
    process.env.GATE_ENABLED = "1"; process.env.GATE_SECRET = "curt";
    process.env.GLOBAL_CONFIG = "https://global-config.vercel.com/ecfg_x?token=t";
    const closed = await middleware(new Request("https://app.example/"));
    assert.equal(closed.status, 503, "encès amb secret feble: es tanca");
    assert.equal(closed.headers.get("x-middleware-next"), null);
    const entry = await middleware(new Request("https://app.example/acces.html"));
    assert.equal(entry.headers.get("x-middleware-next"), "1", "la pantalla d'entrada continua accessible");
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});

test("les funcions de l'API carreguen i responen amb el paquet", async () => {
  const saved = {...process.env};
  try {
    process.env.GLOBAL_CONFIG = "https://global-config.vercel.com/ecfg_x?token=t";
    process.env.ADMIN_KEY = "curta";
    const admin = (await import("../api/admin.ts")).default;
    const r = await admin.fetch(new Request("https://app.example/api/admin"));
    assert.equal(r.status, 503, "ADMIN_KEY feble: el panell es tanca");
    const surt = (await import("../api/surt.ts")).default;
    assert.equal((await surt.fetch()).headers.get("location"), "/acces.html");
    const entra = (await import("../api/entra.ts")).default;
    assert.equal((await entra.fetch(new Request("https://app.example/api/entra", {method: "GET"}))).status, 405, "només s'accepta POST");
    assert.equal((await entra.fetch(new Request("https://app.example/api/entra", {method: "POST", body: JSON.stringify({clau: "x"})}))).status, 503, "sense secret fort, no hi ha sessions");
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});

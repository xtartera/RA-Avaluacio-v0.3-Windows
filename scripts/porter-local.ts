/**
 * Prova local del porter: serveix l'app ja compilada (carpeta dist) darrere el mateix porter que fa servir Vercel,
 * però amb un magatzem en memòria (es buida en aturar-lo). Ús: `npm run porter:local` i obre http://127.0.0.1:5301
 *
 *   GATE=0           apaga el porter (l'app s'obre sense clau)
 *   PORT=5302        canvia el port
 *   ADMIN_KEY=xxxx   canvia la clau del panell (per defecte «admin-local»)
 */
import {createServer} from "node:http";
import {existsSync, readFileSync, statSync} from "node:fs";
import {extname, join} from "node:path";
import {fileURLToPath} from "node:url";
import {newPerson} from "../src/gate/access.ts";
import {randomKey} from "../src/gate/crypto.ts";
import {admin, gate, login, logout} from "../src/gate/handlers.ts";
import type {StoreOp} from "../src/gate/store.ts";

const root = join(fileURLToPath(new URL("..", import.meta.url)), "dist");
if (!existsSync(join(root, "index.html"))) { console.error("Falta la carpeta dist: executa primer «npm run build» (o fes servir «npm run porter:local»)."); process.exit(1); }

const port = Number(process.env.PORT ?? 5301);
const items: Record<string, unknown> = {};
const store = {
  async readAll() { return structuredClone(items); },
  async apply(ops: StoreOp[]) { for (const op of ops) { if (op.operation === "delete") delete items[op.key]; else items[op.key] = structuredClone(op.value); } }
};
// GATE_ALLOW_WEAK només el posa aquest script (i l'ignora Vercel): permet la clau d'administrador de prova «admin-local».
const env = {GATE_ENABLED: process.env.GATE === "0" ? "0" : "1", GATE_SECRET: randomKey(8), ADMIN_KEY: process.env.ADMIN_KEY ?? "admin-local", GATE_ALLOW_WEAK: "1"};

const demo = await newPerson("Persona de prova", null, new Date());
await store.apply([{operation: "upsert", key: `p_${demo.id}`, value: demo.person}]);

const types: Record<string, string> = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".md": "text/markdown; charset=utf-8", ".json": "application/json"};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const request = new Request(url, {method: req.method, headers: req.headers as Record<string, string>, body: ["GET", "HEAD"].includes(req.method ?? "GET") ? undefined : Buffer.concat(chunks)});
    const deps = {env, store, sleep: async () => {}};
    const response = url.pathname === "/api/entra" ? await login(request, deps)
      : url.pathname === "/api/surt" ? logout()
      : url.pathname === "/api/admin" ? await admin(request, deps)
      : await gate(request, deps);
    if (response) {
      const headers: Record<string, string> = {};
      response.headers.forEach((value, name) => { headers[name] = name === "set-cookie" ? value.replace("; Secure", "") : value; }); // en local no hi ha HTTPS
      res.writeHead(response.status, headers);
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    let file = join(root, decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = join(root, "index.html");
    res.writeHead(200, {"content-type": types[extname(file)] ?? "application/octet-stream"});
    res.end(readFileSync(file));
  } catch (error) {
    res.writeHead(500, {"content-type": "text/plain; charset=utf-8"});
    res.end(String(error));
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`\nPorter de prova en marxa: http://127.0.0.1:${port}   (porter ${env.GATE_ENABLED === "1" ? "ENCÈS" : "APAGAT"})`);
  console.log(`  App:         http://127.0.0.1:${port}/            (et portarà a la pantalla d'entrada)`);
  console.log(`  Panell:      http://127.0.0.1:${port}/admin.html   clau d'administrador: ${env.ADMIN_KEY}`);
  console.log(`  Clau de prova per entrar a l'app:  ${demo.key}`);
  console.log("  Les dades són en memòria: en aturar-lo (Ctrl+C) es perden.\n");
});

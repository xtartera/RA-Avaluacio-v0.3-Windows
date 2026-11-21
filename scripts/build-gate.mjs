// Empaqueta el porter (src/gate) en un únic fitxer JavaScript: gate-dist/gate.mjs.
// Vercel compila middleware.ts i api/*.ts però no inclou els fitxers .ts que importen, així que els importen d'aquest paquet.
// Ús: `npm run gate:build` (cal tornar-lo a executar després de tocar src/gate; un test comprova que està al dia).
import {mkdirSync, realpathSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
import {build} from "vite";

// Ruta real (amb les majúscules del disc): a Windows «c:\…» i «C:\…» farien que Vite dupliqués els mòduls i el resultat no fos sempre el mateix.
const root = realpathSync.native(join(dirname(fileURLToPath(import.meta.url)), ".."));
export const OUT_FILE = join(root, "gate-dist", "gate.mjs");
const BANNER = "// GENERAT per scripts/build-gate.mjs a partir de src/gate: no s'edita a mà (npm run gate:build)." + String.fromCharCode(10);

/** Retorna el codi del paquet sense escriure res al disc. */
export async function bundleGate() {
  const result = await build({
    root, configFile: false, logLevel: "silent",
    build: {
      write: false, minify: false, target: "node22", emptyOutDir: false, copyPublicDir: false,
      lib: {entry: join(root, "src/gate/index.ts"), formats: ["es"], fileName: () => "gate.mjs"},
      rollupOptions: {output: {banner: "// GENERAT per scripts/build-gate.mjs a partir de src/gate: no s'edita a mà (npm run gate:build).\n"}}
    }
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(r => ("output" in r ? r.output : []));
  const chunk = outputs.find(o => o.type === "chunk");
  if (!chunk || chunk.type !== "chunk") throw new Error("No s'ha generat el paquet del porter.");
  return `${BANNER}${chunk.code}`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const code = await bundleGate();
  mkdirSync(dirname(OUT_FILE), {recursive: true});
  writeFileSync(OUT_FILE, code, "utf8");
  console.log(`Escrit ${OUT_FILE} (${code.length} caràcters)`);
}

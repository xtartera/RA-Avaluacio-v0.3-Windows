import {edgeConfigStore, gate} from "./gate-dist/gate.mjs";
import type {GateEnv, GateStore} from "./gate-dist/gate.mjs";

/**
 * Porter de l'app: si GATE_ENABLED=1, només deixa passar qui té una sessió vàlida (vegeu src/gate). Sense la variable,
 * no fa res i l'app és oberta com sempre.
 *
 * Importa el paquet generat (gate-dist/gate.mjs, vegeu scripts/build-gate.mjs) i no els fitxers .ts de src/gate: Vercel compila
 * aquest fitxer però no hi inclou els .ts que importa, i el filtre petava amb ERR_MODULE_NOT_FOUND.
 */
let store: GateStore | null = null;

/** «Deixa passar»: el mateix que fa next() de @vercel/functions (una resposta buida amb aquesta capçalera). */
const next = () => new Response(null, {headers: {"x-middleware-next": "1"}});

export default async function middleware(request: Request): Promise<Response> {
  const env = process.env as GateEnv;
  if (env.GATE_ENABLED !== "1") return next();
  store ??= edgeConfigStore(env);
  return (await gate(request, {env, store})) ?? next();
}

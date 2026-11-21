import {next} from "@vercel/functions";
import {gate, type GateEnv} from "./src/gate/handlers.ts";
import {edgeConfigStore, type GateStore} from "./src/gate/store.ts";

/**
 * Porter de l'app: si GATE_ENABLED=1, només deixa passar qui té una sessió vàlida (vegeu src/gate). Sense la variable,
 * no fa res i l'app és oberta com sempre. La lògica i els tests són a src/gate; això només l'enllaça amb Vercel.
 */
let store: GateStore | null = null;

export default async function middleware(request: Request): Promise<Response> {
  const env = process.env as GateEnv;
  if (env.GATE_ENABLED !== "1") return next();
  store ??= edgeConfigStore(env);
  return (await gate(request, {env, store})) ?? next();
}

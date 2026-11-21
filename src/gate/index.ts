// Punt d'entrada del porter: és el que s'empaqueta a gate-dist/gate.mjs (npm run gate:build) perquè Vercel no hagi de resoldre fitxers .ts.
export {admin, gate, login, logout} from "./handlers.ts";
export type {GateDeps, GateEnv} from "./handlers.ts";
export {edgeConfigStore} from "./store.ts";
export type {GateStore, StoreOp} from "./store.ts";

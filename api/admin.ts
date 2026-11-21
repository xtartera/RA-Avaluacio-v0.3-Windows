import {admin, edgeConfigStore} from "../gate-dist/gate.mjs";
import type {GateEnv} from "../gate-dist/gate.mjs";

const store = edgeConfigStore(process.env);

export default {
  async fetch(request: Request): Promise<Response> {
    return admin(request, {env: process.env as GateEnv, store});
  }
};

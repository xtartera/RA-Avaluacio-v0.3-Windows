import {edgeConfigStore, login} from "../gate-dist/gate.mjs";
import type {GateEnv} from "../gate-dist/gate.mjs";

const store = edgeConfigStore(process.env);

export default {
  async fetch(request: Request): Promise<Response> {
    return login(request, {env: process.env as GateEnv, store});
  }
};

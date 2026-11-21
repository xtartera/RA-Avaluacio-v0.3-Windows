import {login, type GateEnv} from "../src/gate/handlers.ts";
import {edgeConfigStore} from "../src/gate/store.ts";

const store = edgeConfigStore(process.env);

export default {
  async fetch(request: Request): Promise<Response> {
    return login(request, {env: process.env as GateEnv, store});
  }
};

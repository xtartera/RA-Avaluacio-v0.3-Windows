import {logout} from "../gate-dist/gate.mjs";

export default {
  async fetch(): Promise<Response> {
    return logout();
  }
};

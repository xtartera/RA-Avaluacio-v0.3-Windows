import {logout} from "../src/gate/handlers.ts";

export default {
  async fetch(): Promise<Response> {
    return logout();
  }
};

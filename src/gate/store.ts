/** Magatzem de la llista d'accés. A Vercel és un Global Config (abans Edge Config): un JSON de clau/valor que s'edita també al panell de Vercel. */

export type StoreOp = {operation: "upsert"; key: string; value: unknown} | {operation: "delete"; key: string};

export interface GateStore {
  readAll(): Promise<Record<string, unknown>>;
  /** Aplica les operacions de cop: si una falla, no s'aplica cap. */
  apply(ops: StoreOp[]): Promise<void>;
}

type Env = Record<string, string | undefined>;

/** Missatge que retorna l'API de Vercel en un error (p. ex. «: Edge Config not found»); mai no conté claus. */
async function apiMessage(response: Response): Promise<string> {
  try {
    const body = (await response.clone().json()) as {error?: {message?: string; code?: string}};
    const text = body.error?.message ?? body.error?.code;
    return text ? `: ${String(text).slice(0, 160)}` : "";
  } catch {
    return "";
  }
}

/**
 * Vercel ha canviat el nom d'Edge Config a «Global Config». Els magatzems nous s'enllacen amb la variable `GLOBAL_CONFIG`
 * (domini global-config.vercel.com) i els antics amb `EDGE_CONFIG` (edge-config.vercel.com); s'accepten les dues.
 *
 * Lectura: `GET <base>/items?version=1` amb la clau de la cadena de connexió com a capçalera Authorization (com fa el SDK de Vercel).
 * Escriptura: API REST de Vercel (`PATCH /v1/edge-config/<id>/items`, que continua vàlida) amb `VERCEL_API_TOKEN`.
 * Les lectures es guarden uns segons per no fer una petició a cada fitxer de l'app.
 */
export function edgeConfigStore(env: Env, fetchFn: typeof fetch = fetch, ttlMs = 4000, clock: () => number = Date.now): GateStore {
  let cache: {at: number; items: Record<string, unknown>} | null = null;
  const connection = () => {
    const text = env.GLOBAL_CONFIG || env.EDGE_CONFIG;
    if (!text) throw new Error("Falta la variable GLOBAL_CONFIG (o EDGE_CONFIG): la cadena de connexió del Global Config enllaçat al projecte.");
    let url: URL;
    try { url = new URL(text); } catch { throw new Error("La cadena de connexió del Global Config no és vàlida."); }
    const id = url.pathname.split("/")[1] ?? "";
    const token = url.searchParams.get("token") ?? "";
    if (!id || !token) throw new Error("La cadena de connexió del Global Config no és vàlida (falta l'identificador o la clau).");
    return {base: `${url.origin}/${id}`, token, id: env.GLOBAL_CONFIG_ID || env.EDGE_CONFIG_ID || id};
  };
  return {
    async readAll() {
      if (cache && clock() - cache.at < ttlMs) return cache.items;
      const {base, token} = connection();
      const response = await fetchFn(`${base}/items?version=1`, {headers: {authorization: `Bearer ${token}`, "cache-control": "no-cache"}});
      if (!response.ok) throw new Error(`No s'ha pogut llegir el Global Config (${response.status}).`);
      const items = (await response.json()) as Record<string, unknown>;
      cache = {at: clock(), items};
      return items;
    },
    async apply(ops) {
      if (!ops.length) return;
      if (!env.VERCEL_API_TOKEN) throw new Error("Falta la variable VERCEL_API_TOKEN (necessària per escriure al Global Config).");
      const {id} = connection();
      // L'equip del magatzem: per identificador (VERCEL_TEAM_ID, «team_…») o pel nom (VERCEL_TEAM_SLUG, el de l'adreça de Vercel).
      const scope = env.VERCEL_TEAM_ID ? `?teamId=${encodeURIComponent(env.VERCEL_TEAM_ID)}` : env.VERCEL_TEAM_SLUG ? `?slug=${encodeURIComponent(env.VERCEL_TEAM_SLUG)}` : "";
      // Vercel ha canviat el nom d'Edge Config a Global Config: es prova l'adreça antiga i, si no la troba (404), la nova.
      const urls = [`https://api.vercel.com/v1/edge-config/${id}/items${scope}`, `https://api.vercel.com/v1/global-config/${id}/items${scope}`];
      const failures: string[] = [];
      cache = null;
      for (const url of urls) {
        const response = await fetchFn(url, {
          method: "PATCH", headers: {authorization: `Bearer ${env.VERCEL_API_TOKEN}`, "content-type": "application/json"}, body: JSON.stringify({items: ops})
        });
        if (response.ok) return;
        failures.push(`${response.status}${await apiMessage(response)}`);
        if (response.status !== 404) break; // només es prova l'altra adreça si aquesta diu «no trobat»
      }
      throw new Error(`No s'ha pogut escriure al Global Config (${failures.join(" / ")}).`);
    }
  };
}

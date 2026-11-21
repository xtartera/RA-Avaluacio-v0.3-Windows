// Criptografia del porter. Només fa servir Web Crypto (disponible a Vercel, a Node 22 i als navegadors).

const encoder = new TextEncoder();
const toHex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join("");

export async function sha256Hex(text: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

export async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

/** Comparació en temps constant (no revela on difereixen dos textos). */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** Sense caràcters que es confonen (0/O, 1/I): 32 símbols, de manera que cada byte aleatori dona un símbol sense biaix. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Clau d'accés personal: 24 símbols en 6 grups (uns 120 bits d'entropia), p. ex. «K7QM-2XWD-…». */
export function randomKey(groups = 6, size = 4): string {
  const bytes = crypto.getRandomValues(new Uint8Array(groups * size));
  const symbols = [...bytes].map(b => ALPHABET[b % ALPHABET.length]);
  const out: string[] = [];
  for (let i = 0; i < groups; i++) out.push(symbols.slice(i * size, (i + 1) * size).join(""));
  return out.join("-");
}

export function randomId(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(4)).buffer);
}

/** Majúscules i sense guions ni espais: la clau s'accepta escrita de qualsevol manera. */
export function normalizeKey(key: string): string {
  return key.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function base64urlEncode(text: string): string {
  const bytes = encoder.encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64urlDecode(text: string): string {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (text.length % 4)) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}

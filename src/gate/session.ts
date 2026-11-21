import {base64urlDecode, base64urlEncode, hmacHex, safeEqual} from "./crypto.ts";

export const SESSION_COOKIE = "sessio";

export interface SessionPayload {
  /** Identificador de la persona. */
  p: string;
  /** Moment d'emissió i de caducitat, en mil·lisegons. */
  iat: number;
  exp: number;
}

/** «càrrega.signatura»: la càrrega va en base64 i la signatura és un HMAC-SHA256 amb el secret del porter. */
export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const body = base64urlEncode(JSON.stringify(payload));
  return `${body}.${await hmacHex(secret, body)}`;
}

export async function verifySession(token: string | undefined, secret: string, now: number): Promise<SessionPayload | null> {
  if (!token || !secret) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot), signature = token.slice(dot + 1);
  if (!safeEqual(signature, await hmacHex(secret, body))) return null;
  try {
    const payload = JSON.parse(base64urlDecode(body)) as SessionPayload;
    if (typeof payload.p !== "string" || typeof payload.exp !== "number" || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

/** Galeta de sessió: no accessible des de JavaScript, només per HTTPS i no s'envia des d'altres webs. */
export function sessionCookie(token: string, days: number): string {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${Math.round(days * 86400)}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

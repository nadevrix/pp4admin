// ─── Admin session cookie ───────────────────────────────────────────────────
// Gate de la UI del panel. NO autentica al hub-api — esa autenticación la hace
// el server-side con ADMIN_HUB_SECRET cuando proxyamos. Acá solo cuidamos que
// nadie vea la UI sin pasar por /admin/login.
//
// Formato cookie:  base64(payload).base64(hmacSha256(secret, payload))
// Payload:         JSON con { exp } en epoch ms.
// Vence sola: si exp < now, la cookie se ignora.
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, timingSafeEqual } from 'node:crypto';

export const COOKIE_NAME = 'pollar_admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

interface Payload {
  exp: number;
}

function getSecret(): string {
  const s = process.env.ADMIN_PANEL_COOKIE_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      'ADMIN_PANEL_COOKIE_SECRET no está configurado o es demasiado corto (min 16 chars)',
    );
  }
  return s;
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

/** Crea una cookie firmada que vence en 8h. */
export function createSessionCookieValue(): string {
  const payload: Payload = { exp: Date.now() + SESSION_TTL_MS };
  const json = JSON.stringify(payload);
  const encoded = b64url(json);
  const sig = sign(encoded);
  return `${encoded}.${sig}`;
}

/** Valida la cookie. Devuelve true solo si la firma matchea y no venció. */
export function isValidSessionCookieValue(value: string | undefined): boolean {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 2) return false;
  const [encoded, sig] = parts;

  let expectedSig: string;
  try {
    expectedSig = sign(encoded);
  } catch {
    return false;
  }

  // Comparación constante en tiempo para no filtrar info por timing.
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;

  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    const payload = JSON.parse(json) as Payload;
    if (typeof payload.exp !== 'number') return false;
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

/** Verifica la password contra ADMIN_PANEL_PASSWORD con timing-safe compare. */
export function isValidPassword(input: string | undefined): boolean {
  const expected = process.env.ADMIN_PANEL_PASSWORD;
  if (!expected || expected.length < 6) return false;
  if (!input || input.length !== expected.length) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return timingSafeEqual(a, b);
}

export const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

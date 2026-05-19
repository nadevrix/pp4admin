// ─── Admin session cookie ───────────────────────────────────────────────────
// Gate de la UI del panel. NO autentica al hub-api — esa autenticación la hace
// el server-side con ADMIN_HUB_SECRET cuando proxyamos. Acá solo cuidamos que
// nadie vea la UI sin pasar por /admin/login.
//
// Implementación: Web Crypto API (HMAC-SHA256) en vez de node:crypto, así
// también corre en Edge Runtime (middleware de Next.js corre en Edge).
//
// Formato cookie:  base64url(payload).base64url(hmacSha256(secret, payload))
// Payload:         JSON con { exp } en epoch ms.
// Vence sola: si exp < now, la cookie se ignora.
// ─────────────────────────────────────────────────────────────────────────────

export const COOKIE_NAME = 'pollar_admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas
export const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

interface Payload {
  exp: number;
}

const encoder = new TextEncoder();

function getSecret(): string {
  const s = process.env.ADMIN_PANEL_COOKIE_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      'ADMIN_PANEL_COOKIE_SECRET no está configurado o es demasiado corto (min 16 chars)',
    );
  }
  return s;
}

// Cache de la CryptoKey — importKey es relativamente caro, lo hacemos 1 vez.
let cachedKey: Promise<CryptoKey> | null = null;
function getKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    cachedKey = crypto.subtle.importKey(
      'raw',
      encoder.encode(getSecret()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
  }
  return cachedKey;
}

function bufToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Nuestros payloads son JSON con números ASCII — btoa directo es seguro.
function strToBase64Url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToStr(s: string): string {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

async function signPayload(payload: string): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return bufToBase64Url(sig);
}

/** Crea una cookie firmada que vence en 8h. */
export async function createSessionCookieValue(): Promise<string> {
  const payload: Payload = { exp: Date.now() + SESSION_TTL_MS };
  const encoded = strToBase64Url(JSON.stringify(payload));
  const sig = await signPayload(encoded);
  return `${encoded}.${sig}`;
}

/** Valida la cookie. Devuelve true solo si la firma matchea y no venció. */
export async function isValidSessionCookieValue(
  value: string | undefined,
): Promise<boolean> {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 2) return false;
  const [encoded, sig] = parts;

  let expectedSig: string;
  try {
    expectedSig = await signPayload(encoded);
  } catch {
    return false;
  }

  if (!constantTimeEqual(sig, expectedSig)) return false;

  try {
    const json = base64UrlToStr(encoded);
    const payload = JSON.parse(json) as Payload;
    if (typeof payload.exp !== 'number') return false;
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

// Comparación constant-time pura en JS — Edge-safe (no usa Buffer ni node:crypto).
// Para nuestro caso (HMAC base64url y passwords cortas) es suficiente: el JIT
// puede optimizar pero el loop hace OR bitwise hasta el final.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Verifica la password contra ADMIN_PANEL_PASSWORD con timing-safe compare. */
export function isValidPassword(input: string | undefined): boolean {
  const expected = process.env.ADMIN_PANEL_PASSWORD;
  if (!expected || expected.length < 6) return false;
  if (!input) return false;
  return constantTimeEqual(input, expected);
}

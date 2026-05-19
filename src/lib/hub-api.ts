// ─── Hub API client (server-side only) ──────────────────────────────────────
// Wrapper de fetch que llama al hub-api con el header X-Admin-Secret.
// Solo se usa desde route handlers del admin (/src/app/api/proxy/*),
// nunca desde el browser. El secret jamás llega al cliente.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';

const HUB_API = process.env.NEXT_PUBLIC_HUB_API_URL || '';
const HUB_SECRET = process.env.ADMIN_HUB_SECRET || '';

export interface HubError {
  status: number;
  body: unknown;
}

/** Valida que el admin haya configurado las envs antes de llamar. */
function ensureConfig(): NextResponse | null {
  if (!HUB_API) {
    return NextResponse.json(
      { error: 'Hub API URL no configurada (NEXT_PUBLIC_HUB_API_URL)' },
      { status: 503 },
    );
  }
  if (!HUB_SECRET) {
    return NextResponse.json(
      { error: 'Admin hub secret no configurado (ADMIN_HUB_SECRET)' },
      { status: 503 },
    );
  }
  return null;
}

/**
 * Hace una request al hub-api con el header X-Admin-Secret.
 * Devuelve un NextResponse listo para devolver desde el route handler.
 * El cuerpo se pasa as-is (preserva forma del backend).
 */
export async function callHub(
  path: string,
  init: RequestInit = {},
): Promise<NextResponse> {
  const configErr = ensureConfig();
  if (configErr) return configErr;

  const url = `${HUB_API.replace(/\/$/, '')}${path}`;
  const headers = new Headers(init.headers);
  headers.set('X-Admin-Secret', HUB_SECRET);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, cache: 'no-store' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: `Fallo conectando con hub-api: ${msg}` },
      { status: 502 },
    );
  }

  // Pasamos el body crudo (puede no ser JSON). Si lo es, lo parseamos.
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // ok — algunos endpoints podrían devolver texto plano
  }

  return NextResponse.json(data, { status: res.status });
}

export function isHubConfigured(): boolean {
  return Boolean(HUB_API) && Boolean(HUB_SECRET);
}

// ─── Browser-side fetch al propio admin (no al hub-api) ─────────────────────
// La UI nunca habla directo con el hub-api. Habla con /api/proxy/* del propio
// admin, y esos route handlers reenvían con el secret server-side.
// ─────────────────────────────────────────────────────────────────────────────

export class AdminFetchError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'AdminFetchError';
  }
}

export async function adminFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, { ...init, headers });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* ok */
  }

  if (!res.ok) {
    const msg =
      (data as { error?: string })?.error ||
      (typeof data === 'string' ? data : `HTTP ${res.status}`);
    // 401 = sesión vencida → redirigir a login (excepto si ya estamos ahí)
    if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.endsWith('/admin/login')) {
      window.location.href = '/admin/login';
    }
    throw new AdminFetchError(res.status, msg);
  }
  return data as T;
}

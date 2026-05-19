// ─── Admin gate middleware ──────────────────────────────────────────────────
// /admin/* requiere cookie firmada. /admin/login es la única excepción.
// /api/proxy/* también requiere cookie (cinturón y tiradores: el route handler
// también la chequea, pero acá cortamos antes).
// El resto del sitio es 404 — no exponemos páginas públicas.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_NAME, isValidSessionCookieValue } from '@/lib/admin-cookie';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /admin/login es público (sin cookie)
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Endpoints de auth siempre permitidos
  if (pathname === '/api/auth/login' || pathname === '/api/auth/logout') {
    return NextResponse.next();
  }

  // Cualquier otra cosa bajo /admin o /api/proxy requiere cookie válida
  const protectedRoute =
    pathname.startsWith('/admin') || pathname.startsWith('/api/proxy');

  if (!protectedRoute) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (isValidSessionCookieValue(cookie)) {
    return NextResponse.next();
  }

  // API → 401 JSON (el cliente redirige)
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Sesión inválida o vencida' }, { status: 401 });
  }

  // UI → redirect a login
  const url = request.nextUrl.clone();
  url.pathname = '/admin/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Todo excepto _next y assets
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

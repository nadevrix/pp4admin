import { NextResponse } from 'next/server';
import {
  COOKIE_NAME,
  SESSION_TTL_SECONDS,
  createSessionCookieValue,
  isValidPassword,
} from '@/lib/admin-cookie';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { password?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  if (!isValidPassword(body.password)) {
    // No discriminamos "password ausente" vs "incorrecta" — mismo mensaje.
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }

  let cookieValue: string;
  try {
    cookieValue = await createSessionCookieValue();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Server misconfig: ${msg}` }, { status: 500 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}

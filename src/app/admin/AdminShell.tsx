'use client';

// ─── Admin shell ────────────────────────────────────────────────────────────
// Nav lateral + topbar. Si la ruta es /admin/login, render children directo
// (la página de login no quiere shell).
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/wallets', label: 'Wallets' },
  { href: '/admin/anomalies', label: 'Anomalías' },
  { href: '/admin/treasury', label: 'Treasury' },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Login no usa shell
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const onLogout = async () => {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/admin/login';
    }
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f7ff]">
      <header className="border-b border-[#e5e7eb] bg-white/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle menu"
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[#f0f7ff]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/admin" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#005DB4] text-white text-xs font-mono font-bold">
                P
              </span>
              <span>Pollar · Admin</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#6b7280] font-mono">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              sesión activa
            </span>
            <button
              onClick={onLogout}
              disabled={signingOut}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#f0f7ff] hover:bg-[#e0f0ff] text-[#005DB4] font-medium disabled:opacity-50"
            >
              {signingOut ? 'Cerrando…' : 'Salir'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Sidebar desktop */}
        <aside className="hidden md:block w-56 shrink-0 border-r border-[#e5e7eb] bg-white">
          <nav className="py-4">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-5 py-2.5 text-sm border-l-4 ${
                  isActive(item.href, item.exact)
                    ? 'border-[#005DB4] text-[#005DB4] bg-[#f0f7ff] font-medium'
                    : 'border-transparent text-[#6b7280] hover:bg-[#f0f7ff] hover:text-[#005DB4]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Drawer mobile */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-[#1a1a1a]/40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
              <div className="h-14 px-5 flex items-center justify-between border-b border-[#e5e7eb]">
                <span className="font-semibold">Menú</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 -mr-2 rounded-lg hover:bg-[#f0f7ff]"
                  aria-label="Cerrar"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="py-3">
                {NAV.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-5 py-3 text-base border-l-4 ${
                      isActive(item.href, item.exact)
                        ? 'border-[#005DB4] text-[#005DB4] bg-[#f0f7ff] font-medium'
                        : 'border-transparent text-[#1a1a1a] hover:bg-[#f0f7ff]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

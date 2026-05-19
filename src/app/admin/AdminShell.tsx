'use client';

// ─── Admin shell ────────────────────────────────────────────────────────────
// Sticky header con logo + sidebar con iconos + footer sutil.
// Login no usa shell.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    exact: true,
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h6v8H4zM14 6h6v4h-6zM14 14h6v4h-6zM4 16h6v2H4z" />
      </svg>
    ),
  },
  {
    href: '/admin/wallets',
    label: 'Wallets',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm12 8h2" />
      </svg>
    ),
  },
  {
    href: '/admin/anomalies',
    label: 'Anomalías',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.34 16a2 2 0 001.73 3z" />
      </svg>
    ),
  },
  {
    href: '/admin/treasury',
    label: 'Treasury',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4M4 10v9h16v-9M9 21v-7h6v7" />
      </svg>
    ),
  },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
      <header className="border-b border-[#e5e7eb] bg-white/85 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle menu"
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[#f0f7ff]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/admin" className="flex items-center gap-2 shrink-0">
              <Image src="/logo.jpg" alt="Pollar" width={32} height={32} priority className="rounded-lg" />
              <div className="flex flex-col leading-none">
                <span className="font-semibold tracking-tight text-base">Pollar Pay</span>
                <span className="text-[10px] uppercase tracking-widest text-[#9ca3af] font-mono">Admin</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
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
              className="text-xs px-3 py-1.5 rounded-lg bg-[#f0f7ff] hover:bg-[#e0f0ff] text-[#005DB4] font-medium disabled:opacity-50 transition-colors"
            >
              {signingOut ? 'Cerrando…' : 'Salir'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[#e5e7eb] bg-white">
          <nav className="py-4 flex-1">
            <div className="px-5 mb-2 text-[10px] uppercase tracking-widest text-[#9ca3af] font-mono">
              Operaciones
            </div>
            {NAV.map(item => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-5 py-2.5 text-sm border-l-4 transition-colors ${
                    active
                      ? 'border-[#005DB4] text-[#005DB4] bg-[#f0f7ff] font-medium'
                      : 'border-transparent text-[#6b7280] hover:bg-[#f0f7ff] hover:text-[#005DB4]'
                  }`}
                >
                  <span className={active ? 'text-[#005DB4]' : 'text-[#9ca3af]'}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-5 py-4 border-t border-[#e5e7eb]">
            <div className="text-[10px] uppercase tracking-widest text-[#9ca3af] font-mono mb-1">
              Versión
            </div>
            <div className="text-xs text-[#6b7280]">v0.1 · panel interno</div>
          </div>
        </aside>

        {/* Drawer mobile */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-[#1a1a1a]/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col">
              <div className="h-16 px-5 flex items-center justify-between border-b border-[#e5e7eb]">
                <div className="flex items-center gap-2">
                  <Image src="/logo.jpg" alt="Pollar" width={28} height={28} className="rounded-md" />
                  <span className="font-semibold">Pollar · Admin</span>
                </div>
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
              <nav className="flex-1 py-3 overflow-y-auto">
                {NAV.map(item => {
                  const active = isActive(item.href, item.exact);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-5 py-3 text-base border-l-4 ${
                        active
                          ? 'border-[#005DB4] text-[#005DB4] bg-[#f0f7ff] font-medium'
                          : 'border-transparent text-[#1a1a1a] hover:bg-[#f0f7ff]'
                      }`}
                    >
                      <span className={active ? 'text-[#005DB4]' : 'text-[#9ca3af]'}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

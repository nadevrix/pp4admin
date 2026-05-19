'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      window.location.href = '/admin';
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-[#f0f7ff] overflow-hidden">
      {/* Halo azul Pollar — mismo gesto que la landing */}
      <div
        className="absolute inset-0 -z-10 opacity-70 pointer-events-none"
        style={{
          background:
            'radial-gradient(800px 400px at 50% 0%, rgba(0,93,180,0.18), transparent 70%)',
        }}
      />

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Image src="/logo.jpg" alt="Pollar" width={40} height={40} priority className="rounded-xl shadow-sm" />
            <div className="flex flex-col items-start leading-none">
              <span className="font-semibold tracking-tight text-lg">Pollar Pay</span>
              <span className="text-[10px] uppercase tracking-widest text-[#9ca3af] font-mono mt-0.5">
                Admin
              </span>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Panel interno</h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Acceso restringido. Ingresá la clave para continuar.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white border border-[#e5e7eb] rounded-2xl p-6 sm:p-7 shadow-sm"
        >
          <label className="block text-sm font-medium text-[#6b7280] mb-1.5">
            Clave de acceso
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            required
            autoComplete="current-password"
            placeholder="••••••••••••••"
            className="w-full px-4 py-2.5 bg-[#f0f7ff] border border-[#e5e7eb] rounded-lg text-[#1a1a1a] focus:outline-none focus:border-[#005DB4] focus:ring-1 focus:ring-[#005DB4] font-mono placeholder:text-[#9ca3af]"
          />

          {error && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs flex items-start gap-2">
              <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.19 16a2 2 0 001.74 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !password}
            className="mt-4 w-full py-2.5 rounded-lg bg-[#005DB4] hover:bg-[#0047a0] text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Verificando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-[#9ca3af] mt-5 flex items-center justify-center gap-1.5">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.66 1.34-3 3-3s3 1.34 3 3v3M6 11v-3a6 6 0 1112 0v3m-6 4v2m-7-2a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6z" />
          </svg>
          Sesión válida por 8 horas
        </p>
      </div>
    </main>
  );
}

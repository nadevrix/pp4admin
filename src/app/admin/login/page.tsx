'use client';

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
    <main className="min-h-screen bg-[#f0f7ff] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-block text-xs font-mono tracking-widest uppercase text-[#9ca3af] mb-2">
            Pollar · Admin
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Panel interno</h1>
          <p className="text-sm text-[#6b7280] mt-1">
            Acceso restringido. Ingresá la clave para continuar.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm"
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
            className="w-full px-4 py-2.5 bg-[#f0f7ff] border border-[#e5e7eb] rounded-lg text-[#1a1a1a] focus:outline-none focus:border-[#005DB4] focus:ring-1 focus:ring-[#005DB4] font-mono"
          />

          {error && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs">
              {error}
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

        <p className="text-center text-xs text-[#9ca3af] mt-4">
          Sesión válida por 8 horas.
        </p>
      </div>
    </main>
  );
}

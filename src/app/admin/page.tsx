'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';

interface DashboardData {
  pool: { total: number; available: number; locked: number };
  treasury: { count: number; public_key: string | null };
  transactions: { total: number; completed: number; pending: number; anomalies: number; last_24h: number };
  volume: { total_processed_usdc: string };
}

interface DashboardResp {
  success: boolean;
  data: DashboardData;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const r = await adminFetch<DashboardResp>('/api/proxy/dashboard');
      setData(r.data);
      setLastUpdated(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  // Estado general del sistema — ok si no hay anomalies y hay pool disponible
  const systemOk = data && data.transactions.anomalies === 0 && data.pool.available > 0;
  const systemWarning = data && (data.transactions.anomalies > 0 || data.pool.available === 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#9ca3af] font-mono mb-1.5">
              <span>Pollar Pay</span>
              <span className="text-[#e5e7eb]">·</span>
              <span>Operaciones internas</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-[#6b7280] text-sm mt-1">
              Estado del sistema en tiempo real.{' '}
              {systemOk && (
                <span className="inline-flex items-center gap-1.5 text-emerald-700">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                  </span>
                  Todo OK
                </span>
              )}
              {systemWarning && (
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
                  Requiere atención
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
            {lastUpdated && (
              <span className="hidden sm:inline">
                Actualizado {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={load}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#e5e7eb] hover:bg-[#f0f7ff] text-[#005DB4] text-xs font-medium disabled:opacity-50 transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Refrescando…' : 'Refrescar'}
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.19 16a2 2 0 001.74 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {!data && !error && (
        <div className="flex items-center gap-2 text-[#9ca3af] text-sm">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9" />
          </svg>
          Cargando KPIs…
        </div>
      )}

      {data && (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <Kpi
              label="Volumen total"
              value={`$${data.volume.total_processed_usdc}`}
              sub="USDC procesado"
              accent
            />
            <Kpi
              label="Últimas 24 h"
              value={data.transactions.last_24h.toLocaleString()}
              sub="transacciones"
            />
            <Kpi
              label="Pool wallets"
              value={`${data.pool.available}/${data.pool.total}`}
              sub={`${data.pool.locked} en uso`}
            />
            <Kpi
              label="Treasury"
              value={data.treasury.count.toString()}
              sub={data.treasury.public_key ? truncate(data.treasury.public_key, 8, 6) : 'no creada'}
              mono={Boolean(data.treasury.public_key)}
            />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Transacciones">
              <Row label="Total" value={data.transactions.total.toLocaleString()} />
              <Row label="Completadas" value={data.transactions.completed.toLocaleString()} color="emerald" />
              <Row label="Pendientes" value={data.transactions.pending.toLocaleString()} color="amber" />
              <Row label="Anomalías" value={data.transactions.anomalies.toLocaleString()} color={data.transactions.anomalies > 0 ? 'rose' : undefined} />
              {data.transactions.anomalies > 0 && (
                <Link
                  href="/admin/anomalies"
                  className="mt-3 inline-flex items-center gap-1 text-xs text-[#005DB4] hover:text-[#0047a0] font-medium"
                >
                  Revisar anomalías
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </Card>

            <Card title="Pool de wallets">
              <Row label="Total" value={data.pool.total.toLocaleString()} />
              <Row label="Disponibles" value={data.pool.available.toLocaleString()} color="emerald" />
              <Row label="Lockeadas" value={data.pool.locked.toLocaleString()} color={data.pool.locked > 0 ? 'amber' : undefined} />
              <Link
                href="/admin/wallets"
                className="mt-3 inline-flex items-center gap-1 text-xs text-[#005DB4] hover:text-[#0047a0] font-medium"
              >
                Administrar pool
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  mono,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`bg-white border rounded-2xl p-4 sm:p-5 transition-colors ${
        accent ? 'border-[#005DB4]/30 ring-1 ring-[#005DB4]/10' : 'border-[#e5e7eb]'
      }`}
    >
      <div className="text-xs text-[#9ca3af] mb-1.5">{label}</div>
      <div className={`text-xl sm:text-2xl font-bold ${mono ? 'font-mono' : 'tabular-nums'} ${accent ? 'text-[#005DB4]' : 'text-[#1a1a1a]'} truncate`}>
        {value}
      </div>
      {sub && <div className="text-xs text-[#9ca3af] mt-1 truncate">{sub}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 sm:p-6">
      <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-[#9ca3af]">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: 'emerald' | 'amber' | 'rose' }) {
  const colorClass =
    color === 'emerald' ? 'text-emerald-700' :
    color === 'amber'   ? 'text-amber-700'   :
    color === 'rose'    ? 'text-rose-700'    : 'text-[#1a1a1a]';
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#6b7280]">{label}</span>
      <span className={`font-mono font-semibold tabular-nums ${colorClass}`}>{value}</span>
    </div>
  );
}

function truncate(s: string, head: number, tail: number) {
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

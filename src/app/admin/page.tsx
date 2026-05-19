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

  const load = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const r = await adminFetch<DashboardResp>('/api/proxy/dashboard');
      setData(r.data);
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

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-[#6b7280] text-sm mt-1">Estado del sistema en tiempo real.</p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="px-3 py-1.5 rounded-lg bg-[#f0f7ff] hover:bg-[#e0f0ff] text-[#005DB4] text-xs font-medium disabled:opacity-50"
        >
          {refreshing ? 'Refrescando…' : 'Refrescar'}
        </button>
      </header>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {!data && !error && (
        <div className="text-[#9ca3af] text-sm">Cargando…</div>
      )}

      {data && (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Kpi label="Pool wallets" value={data.pool.total.toString()} sub={`${data.pool.available} libres · ${data.pool.locked} en uso`} />
            <Kpi label="Treasury" value={data.treasury.count.toString()} sub={data.treasury.public_key ? truncate(data.treasury.public_key, 10, 6) : 'no creada'} mono={Boolean(data.treasury.public_key)} />
            <Kpi label="Volumen total" value={`$${data.volume.total_processed_usdc}`} sub="USDC bruto procesado" />
            <Kpi label="Últimas 24 h" value={data.transactions.last_24h.toLocaleString()} sub="transacciones" />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Transacciones">
              <Row label="Total" value={data.transactions.total.toLocaleString()} />
              <Row label="Completadas" value={data.transactions.completed.toLocaleString()} color="emerald" />
              <Row label="Pendientes" value={data.transactions.pending.toLocaleString()} color="amber" />
              <Row label="Anomalías" value={data.transactions.anomalies.toLocaleString()} color="rose" />
              {data.transactions.anomalies > 0 && (
                <Link
                  href="/admin/anomalies"
                  className="mt-3 inline-block text-xs text-[#005DB4] hover:text-[#0047a0] font-medium"
                >
                  Revisar anomalías →
                </Link>
              )}
            </Card>

            <Card title="Pool de wallets">
              <Row label="Total" value={data.pool.total.toLocaleString()} />
              <Row label="Disponibles" value={data.pool.available.toLocaleString()} color="emerald" />
              <Row label="Lockeadas" value={data.pool.locked.toLocaleString()} color="amber" />
              <Link
                href="/admin/wallets"
                className="mt-3 inline-block text-xs text-[#005DB4] hover:text-[#0047a0] font-medium"
              >
                Administrar pool →
              </Link>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, mono }: { label: string; value: string; sub?: string; mono?: boolean }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 sm:p-5">
      <div className="text-xs text-[#9ca3af] mb-1.5">{label}</div>
      <div className={`text-xl sm:text-2xl font-bold ${mono ? 'font-mono' : 'tabular-nums'} truncate`}>{value}</div>
      {sub && <div className="text-xs text-[#9ca3af] mt-1 truncate">{sub}</div>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="space-y-1.5">{children}</div>
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

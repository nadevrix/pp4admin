'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

interface AnomalyTx {
  id: string;
  status: string;
  forward_status: string;
  amount_expected: string;
  amount_paid: string;
  wallet_pubkey: string | null;
  created_at: string;
  expires_at: string;
  project_id: string;
  project_name: string | null;
  reason: string;
}

const NETWORK = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET').toUpperCase();
const EXPERT_SEG = NETWORK === 'MAINNET' ? 'public' : 'testnet';

export default function AdminAnomaliesPage() {
  const [rows, setRows] = useState<AnomalyTx[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryMsg, setRetryMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await adminFetch<{ data: { transactions: AnomalyTx[] } }>('/api/proxy/anomalies');
      setRows(r.data.transactions);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const retry = async (id: string) => {
    if (!confirm('¿Reintentar el forward de esta transacción?\n\nSe va a intentar mandar los fondos colgados al payout_wallet del comercio. Si pasa, la wallet del pool se libera.')) return;
    setRetrying(id);
    setRetryMsg(null);
    try {
      const r = await adminFetch<{ success: boolean; status: string; error?: string }>(`/api/proxy/tx/${id}/retry-forward`, { method: 'POST' });
      if (r.success) {
        setRetryMsg({ kind: 'ok', text: `Tx ${id.slice(0, 8)}… → ${r.status}` });
      } else {
        setRetryMsg({ kind: 'err', text: `Tx ${id.slice(0, 8)}…: ${r.error || r.status}` });
      }
      await load();
    } catch (e: unknown) {
      setRetryMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#9ca3af] font-mono mb-1.5">
              <span>Pollar Pay</span>
              <span className="text-[#e5e7eb]">·</span>
              <span>Fondos a recuperar</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Anomalías</h1>
            <p className="text-[#6b7280] text-sm mt-1">
              Transacciones con <code className="text-xs bg-[#f0f7ff] px-1.5 py-0.5 rounded">forward_status=failed</code> — fondos del cliente colgados en pool wallets.
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#e5e7eb] hover:bg-[#f0f7ff] text-[#005DB4] text-xs font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refrescar
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {retryMsg && (
        <div
          className={`mb-4 p-3 rounded-lg border text-sm ${
            retryMsg.kind === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-700'
          }`}
        >
          {retryMsg.text}
        </div>
      )}

      {rows === null ? (
        <div className="text-[#9ca3af] text-sm">Cargando…</div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-3">
            <svg className="w-6 h-6 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-semibold mb-1">Sin anomalías pendientes</h2>
          <p className="text-sm text-[#6b7280]">Todos los forwards salieron OK.</p>
        </div>
      ) : (
        <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden">
          {/* Mobile */}
          <div className="md:hidden divide-y divide-[#e5e7eb]">
            {rows.map(t => (
              <div key={t.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.reason || '—'}</div>
                    <div className="text-xs text-[#9ca3af] truncate">
                      {t.project_name || t.project_id.slice(0, 8)} · {fmtDate(t.created_at)}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border bg-rose-500/10 border-rose-500/20 text-rose-700">
                    {t.forward_status}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#6b7280]">Recibido</span>
                  <span className="font-mono">{parseFloat(t.amount_paid).toFixed(2)} / {parseFloat(t.amount_expected).toFixed(2)} USDC</span>
                </div>
                {t.wallet_pubkey && (
                  <a
                    href={`https://stellar.expert/explorer/${EXPERT_SEG}/account/${t.wallet_pubkey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-mono text-[11px] text-[#005DB4] break-all"
                  >
                    {t.wallet_pubkey.slice(0, 10)}…{t.wallet_pubkey.slice(-6)} ↗
                  </a>
                )}
                <button
                  onClick={() => retry(t.id)}
                  disabled={retrying === t.id}
                  className="w-full text-xs px-3 py-1.5 rounded-md bg-[#005DB4] hover:bg-[#0047a0] text-white font-medium disabled:opacity-50"
                >
                  {retrying === t.id ? 'Reintentando…' : 'Reintentar forward'}
                </button>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#9ca3af] border-b border-[#e5e7eb]">
                  <th className="px-5 py-3 font-medium">Tx</th>
                  <th className="px-5 py-3 font-medium">Sucursal</th>
                  <th className="px-5 py-3 font-medium">Motivo</th>
                  <th className="px-5 py-3 font-medium text-right">Recibido / Esperado</th>
                  <th className="px-5 py-3 font-medium">Pool wallet</th>
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(t => (
                  <tr key={t.id} className="border-b border-[#e5e7eb] last:border-0">
                    <td className="px-5 py-3 font-mono text-xs text-[#6b7280]">{t.id.slice(0, 8)}…</td>
                    <td className="px-5 py-3 text-xs">{t.project_name || '—'}</td>
                    <td className="px-5 py-3 text-xs text-[#6b7280] max-w-[200px] truncate">{t.reason}</td>
                    <td className="px-5 py-3 text-right font-mono text-xs">
                      {parseFloat(t.amount_paid).toFixed(2)} / {parseFloat(t.amount_expected).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {t.wallet_pubkey ? (
                        <a
                          href={`https://stellar.expert/explorer/${EXPERT_SEG}/account/${t.wallet_pubkey}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#005DB4] hover:text-[#0047a0] font-mono"
                        >
                          {t.wallet_pubkey.slice(0, 8)}…↗
                        </a>
                      ) : (
                        <span className="text-[#9ca3af]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#9ca3af] whitespace-nowrap">{fmtDate(t.created_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => retry(t.id)}
                        disabled={retrying === t.id}
                        className="text-xs px-2.5 py-1 rounded-md bg-[#005DB4] hover:bg-[#0047a0] text-white font-medium disabled:opacity-50"
                      >
                        {retrying === t.id ? '…' : 'Reintentar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

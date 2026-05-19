'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

interface AnomalyTx {
  id: string;
  status: string;
  forward_status: string;
  amount_expected: string;
  amount_paid: string;
  excess: string;
  wallet_pubkey: string | null;
  created_at: string;
  expires_at: string;
  project_id: string;
  project_name: string | null;
  reason: string;
  support_resolved_at: string | null;
}

interface AnomaliesResp {
  data: {
    forward_failures: AnomalyTx[];
    overpayments: AnomalyTx[];
    recently_resolved: AnomalyTx[];
    counts: { forward_failures: number; overpayments: number; recently_resolved: number };
  };
}

const NETWORK = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET').toUpperCase();
const EXPERT_SEG = NETWORK === 'MAINNET' ? 'public' : 'testnet';

export default function AdminAnomaliesPage() {
  const [forwardFailures, setForwardFailures] = useState<AnomalyTx[] | null>(null);
  const [overpayments, setOverpayments] = useState<AnomalyTx[] | null>(null);
  const [recentlyResolved, setRecentlyResolved] = useState<AnomalyTx[] | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await adminFetch<AnomaliesResp>('/api/proxy/anomalies');
      setForwardFailures(r.data.forward_failures);
      setOverpayments(r.data.overpayments);
      setRecentlyResolved(r.data.recently_resolved);
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

  const flash = (kind: 'ok' | 'err', text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 4500);
  };

  const retryForward = async (id: string) => {
    if (!confirm('¿Reintentar el forward de esta transacción?\n\nSe va a intentar mandar los fondos colgados al payout_wallet del comercio. Si pasa, la wallet del pool se libera.')) return;
    setBusyId(id);
    try {
      const r = await adminFetch<{ success: boolean; status: string; error?: string }>(`/api/proxy/tx/${id}/retry-forward`, { method: 'POST' });
      flash(r.success ? 'ok' : 'err', r.success ? `Tx ${id.slice(0, 8)}… → ${r.status}` : `${r.error || r.status}`);
      await load();
    } catch (e: unknown) {
      flash('err', e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const markResolved = async (id: string) => {
    if (!confirm('¿Marcar este caso como resuelto manualmente?\n\nSe oculta de esta lista. Si lo hiciste por error, podés deshacer desde "Resueltos recientemente" abajo.')) return;
    setBusyId(id);
    try {
      await adminFetch(`/api/proxy/tx/${id}/mark-resolved`, { method: 'POST' });
      flash('ok', `Tx ${id.slice(0, 8)}… marcada como resuelta`);
      await load();
    } catch (e: unknown) {
      flash('err', e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const undoResolved = async (id: string) => {
    if (!confirm('¿Deshacer? Esta tx vuelve a aparecer como pendiente en la lista de arriba.')) return;
    setBusyId(id);
    try {
      await adminFetch(`/api/proxy/tx/${id}/mark-resolved`, { method: 'DELETE' });
      flash('ok', `Tx ${id.slice(0, 8)}… vuelve a pendiente`);
      await load();
    } catch (e: unknown) {
      flash('err', e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
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
              <span>Requiere acción manual</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Anomalías</h1>
            <p className="text-[#6b7280] text-sm mt-1">
              Forwards fallidos (fondos colgados en pool) + overpaids pendientes de revisión con el cliente.
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
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm">{error}</div>
      )}

      {toast && (
        <div className={`mb-4 p-3 rounded-lg border text-sm ${
          toast.kind === 'ok'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-700'
        }`}>{toast.text}</div>
      )}

      {/* ── SECCIÓN 1: Forwards fallidos ─────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-end justify-between mb-3 px-1">
          <h2 className="text-[10px] uppercase tracking-widest text-[#9ca3af] font-mono">
            Forwards fallidos — fondos colgados en pool
            {forwardFailures && forwardFailures.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-700 text-[10px] font-bold">
                {forwardFailures.length}
              </span>
            )}
          </h2>
        </div>

        {forwardFailures === null ? (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 text-[#9ca3af] text-sm">Cargando…</div>
        ) : forwardFailures.length === 0 ? (
          <div className="bg-white border border-emerald-500/20 rounded-2xl p-5 text-center text-sm text-[#6b7280]">
            ✓ Todos los forwards salieron OK
          </div>
        ) : (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden">
            <div className="divide-y divide-[#e5e7eb]">
              {forwardFailures.map(tx => (
                <ForwardFailureRow
                  key={tx.id}
                  tx={tx}
                  onRetry={retryForward}
                  onResolved={markResolved}
                  busy={busyId === tx.id}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── SECCIÓN 2: Overpaids ────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-end justify-between mb-3 px-1">
          <h2 className="text-[10px] uppercase tracking-widest text-[#9ca3af] font-mono">
            Overpaids — clientes que pagaron de más
            {overpayments && overpayments.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-[10px] font-bold">
                {overpayments.length}
              </span>
            )}
          </h2>
        </div>

        {overpayments === null ? (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 text-[#9ca3af] text-sm">Cargando…</div>
        ) : overpayments.length === 0 ? (
          <div className="bg-white border border-emerald-500/20 rounded-2xl p-5 text-center text-sm text-[#6b7280]">
            ✓ Ningún overpaid pendiente
          </div>
        ) : (
          <>
            <p className="text-xs text-[#9ca3af] mb-2 px-1">
              El excedente quedó en la treasury. Contactá al cliente (whatsapp / soporte) y marcá como <b>Comprobado</b> cuando lo resolviste off-system.
            </p>
            <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden">
              <div className="divide-y divide-[#e5e7eb]">
                {overpayments.map(tx => (
                  <OverpaymentRow
                    key={tx.id}
                    tx={tx}
                    onResolved={markResolved}
                    busy={busyId === tx.id}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── SECCIÓN 3: Resueltos recientemente (deshacer) ─────────── */}
      <section>
        <button
          type="button"
          onClick={() => setShowResolved(s => !s)}
          className="flex items-end justify-between w-full mb-3 px-1 text-left"
        >
          <h2 className="text-[10px] uppercase tracking-widest text-[#9ca3af] font-mono">
            Resueltos recientemente
            {recentlyResolved && recentlyResolved.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-[#f0f7ff] text-[#6b7280] text-[10px] font-bold">
                {recentlyResolved.length}
              </span>
            )}
          </h2>
          <span className="text-[10px] text-[#005DB4] font-mono">
            {showResolved ? 'Ocultar ▲' : 'Mostrar ▼'}
          </span>
        </button>

        {showResolved && (
          recentlyResolved === null ? (
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 text-[#9ca3af] text-sm">Cargando…</div>
          ) : recentlyResolved.length === 0 ? (
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 text-center text-sm text-[#9ca3af]">
              Sin resoluciones recientes
            </div>
          ) : (
            <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden">
              <div className="divide-y divide-[#e5e7eb]">
                {recentlyResolved.map(tx => (
                  <ResolvedRow
                    key={tx.id}
                    tx={tx}
                    onUndo={undoResolved}
                    busy={busyId === tx.id}
                  />
                ))}
              </div>
            </div>
          )
        )}
      </section>
    </div>
  );
}

function ResolvedRow({
  tx,
  onUndo,
  busy,
}: {
  tx: AnomalyTx;
  onUndo: (id: string) => void;
  busy: boolean;
}) {
  const paid = parseFloat(tx.amount_paid);
  const expected = parseFloat(tx.amount_expected);
  const excess = parseFloat(tx.excess);
  const isOverpaid = tx.status === 'overpaid';
  const isForwardFail = tx.forward_status === 'failed';
  return (
    <div className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 opacity-80">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-xs text-[#1a1a1a] truncate">
            {tx.project_name || tx.project_id.slice(0, 8)} · {tx.reason || '—'}
          </span>
          {isOverpaid && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-amber-500/10 border-amber-500/20 text-amber-700">
              overpaid
            </span>
          )}
          {isForwardFail && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-rose-500/10 border-rose-500/20 text-rose-700">
              forward failed
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded border bg-emerald-500/10 border-emerald-500/20 text-emerald-700">
            ✓ resuelto
          </span>
        </div>
        <div className="text-[11px] text-[#9ca3af]">
          <span className="font-mono">{paid.toFixed(2)} / {expected.toFixed(2)} USDC</span>
          {excess > 0 && <span className="ml-2">· +{excess.toFixed(2)} excedente</span>}
          {tx.support_resolved_at && (
            <span className="ml-2">· resuelto {fmtDate(tx.support_resolved_at)}</span>
          )}
        </div>
      </div>
      <button
        onClick={() => onUndo(tx.id)}
        disabled={busy}
        className="text-xs px-3 py-1 rounded-md bg-[#f0f7ff] hover:bg-[#e0f0ff] text-[#005DB4] font-medium disabled:opacity-50 shrink-0"
      >
        {busy ? '…' : 'Deshacer'}
      </button>
    </div>
  );
}

function ForwardFailureRow({
  tx,
  onRetry,
  onResolved,
  busy,
}: {
  tx: AnomalyTx;
  onRetry: (id: string) => void;
  onResolved: (id: string) => void;
  busy: boolean;
}) {
  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-medium text-[#1a1a1a] truncate">
            {tx.project_name || tx.project_id.slice(0, 8)}
          </span>
          <span className="text-xs text-[#9ca3af]">·</span>
          <span className="text-xs text-[#6b7280] truncate">{tx.reason || '—'}</span>
          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border bg-rose-500/10 border-rose-500/20 text-rose-700">
            {tx.forward_status}
          </span>
        </div>
        <div className="text-xs text-[#6b7280]">
          Recibido <span className="font-mono text-[#1a1a1a]">{parseFloat(tx.amount_paid).toFixed(2)}</span> / {parseFloat(tx.amount_expected).toFixed(2)} USDC
          <span className="text-[#9ca3af] ml-2">{fmtDate(tx.created_at)}</span>
        </div>
        {tx.wallet_pubkey && (
          <a
            href={`https://stellar.expert/explorer/${EXPERT_SEG}/account/${tx.wallet_pubkey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-mono text-[11px] text-[#005DB4] truncate mt-1"
          >
            pool: {tx.wallet_pubkey.slice(0, 10)}…{tx.wallet_pubkey.slice(-6)} ↗
          </a>
        )}
        <div className="text-[10px] text-[#9ca3af] font-mono mt-1 truncate">tx {tx.id}</div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => onRetry(tx.id)}
          disabled={busy}
          className="text-xs px-3 py-1.5 rounded-md bg-[#005DB4] hover:bg-[#0047a0] text-white font-medium disabled:opacity-50"
        >
          {busy ? '…' : 'Reintentar'}
        </button>
        <button
          onClick={() => onResolved(tx.id)}
          disabled={busy}
          className="text-xs px-3 py-1.5 rounded-md bg-[#f0f7ff] hover:bg-[#e0f0ff] text-[#005DB4] font-medium disabled:opacity-50"
        >
          Comprobado
        </button>
      </div>
    </div>
  );
}

function OverpaymentRow({
  tx,
  onResolved,
  busy,
}: {
  tx: AnomalyTx;
  onResolved: (id: string) => void;
  busy: boolean;
}) {
  const expected = parseFloat(tx.amount_expected);
  const paid = parseFloat(tx.amount_paid);
  const excess = parseFloat(tx.excess);
  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-medium text-[#1a1a1a] truncate">
            {tx.project_name || tx.project_id.slice(0, 8)}
          </span>
          <span className="text-xs text-[#9ca3af]">·</span>
          <span className="text-xs text-[#6b7280] truncate">{tx.reason || '—'}</span>
        </div>
        <div className="text-xs text-[#6b7280] flex items-center gap-3 flex-wrap">
          <span>
            Pagó <span className="font-mono text-[#1a1a1a]">{paid.toFixed(2)}</span> / {expected.toFixed(2)} USDC
          </span>
          <span className="inline-flex items-center gap-1 text-amber-700 font-mono font-semibold">
            +{excess.toFixed(2)} excedente
          </span>
          <span className="text-[#9ca3af]">{fmtDate(tx.created_at)}</span>
        </div>
        <div className="text-[10px] text-[#9ca3af] font-mono mt-1 break-all">tx {tx.id}</div>
      </div>
      <button
        onClick={() => onResolved(tx.id)}
        disabled={busy}
        className="text-xs px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50 shrink-0"
      >
        {busy ? '…' : 'Comprobado'}
      </button>
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

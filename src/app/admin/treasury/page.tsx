'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

interface TreasuryStatus {
  exists: boolean;
  public_key?: string;
  created_at?: string;
}

interface RefundableTx {
  id: string;
  status: string;
  amount_expected: string;
  amount_paid: string;
  excess: string;
  wallet_pubkey: string | null;
  crypto_tx_hash: string | null;
  forward_tx_hash: string | null;
  created_at: string;
  project_id: string;
  project_name: string | null;
  reason: string;
}

const NETWORK = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET').toUpperCase();
const EXPERT_SEG = NETWORK === 'MAINNET' ? 'public' : 'testnet';
const isMainnet = NETWORK === 'MAINNET';

export default function AdminTreasuryPage() {
  const [status, setStatus] = useState<TreasuryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState('');
  const [setupRunning, setSetupRunning] = useState(false);

  const [refundables, setRefundables] = useState<RefundableTx[] | null>(null);

  const [txId, setTxId] = useState('');
  const [dest, setDest] = useState('');
  const [amount, setAmount] = useState('');
  const [refundRunning, setRefundRunning] = useState(false);
  const [refundResult, setRefundResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const formRef = useRef<HTMLFormElement | null>(null);
  const destRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await adminFetch<TreasuryStatus>('/api/proxy/treasury');
      setStatus(r);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const loadRefundables = useCallback(async () => {
    try {
      const r = await adminFetch<{ data: { transactions: RefundableTx[] } }>(
        '/api/proxy/refundable',
      );
      setRefundables(r.data.transactions);
    } catch (e: unknown) {
      // No bloquea — la página sigue mostrando el resto
      console.error('refundable list failed', e);
      setRefundables([]);
    }
  }, []);

  useEffect(() => {
    load();
    loadRefundables();
  }, [load, loadRefundables]);

  const setupTreasury = async () => {
    if (isMainnet && !setupSecret.trim()) {
      setError('En mainnet hay que pasar una secret key pre-fondeada (≥ 2 XLM).');
      return;
    }
    if (!confirm(`¿Crear la treasury wallet?\n\n${isMainnet ? 'Mainnet: usa la secret key provista.' : 'Testnet: se fondea con Friendbot.'}\n\nEsta operación es única — una vez creada, no se reemplaza desde acá.`)) return;
    setSetupRunning(true);
    setError(null);
    try {
      const body = isMainnet ? JSON.stringify({ secret: setupSecret.trim() }) : undefined;
      await adminFetch('/api/proxy/treasury', { method: 'POST', body });
      setSetupSecret('');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSetupRunning(false);
    }
  };

  const fillFromRefundable = (tx: RefundableTx) => {
    setTxId(tx.id);
    setAmount(parseFloat(tx.excess).toFixed(2));
    setDest('');
    setRefundResult(null);
    // Scrollea al form y focusea el campo destino (lo único que falta tipear)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      destRef.current?.focus();
    }, 50);
  };

  const submitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setRefundResult(null);
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setRefundResult({ ok: false, msg: 'Monto inválido' });
      return;
    }
    if (!/^G[A-Z2-7]{55}$/.test(dest.trim())) {
      setRefundResult({ ok: false, msg: 'Wallet destino inválida (debe empezar con G y tener 56 chars)' });
      return;
    }
    if (!confirm(`¿Confirmar reembolso?\n\nTx: ${txId}\nDestino: ${dest.slice(0, 12)}…${dest.slice(-6)}\nMonto: ${parsed.toFixed(2)} USDC\n\nLos fondos salen de la treasury y se marca la tx como refunded.`)) return;

    setRefundRunning(true);
    try {
      const r = await adminFetch<{ success: boolean; hash?: string; message?: string }>(
        '/api/proxy/refund',
        {
          method: 'POST',
          body: JSON.stringify({
            transaction_id: txId.trim(),
            destination_wallet: dest.trim(),
            amount: parsed.toFixed(7),
          }),
        },
      );
      setRefundResult({ ok: true, msg: `${r.message || 'Reembolso emitido'} · hash ${r.hash?.slice(0, 12) ?? '—'}…` });
      setTxId('');
      setDest('');
      setAmount('');
      // Refresh list — el tx ya no debería aparecer (pasa a status=refunded)
      loadRefundables();
    } catch (e: unknown) {
      setRefundResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setRefundRunning(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
      <header className="mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#9ca3af] font-mono mb-1.5">
          <span>Pollar Pay</span>
          <span className="text-[#e5e7eb]">·</span>
          <span>Caja del sistema</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Treasury</h1>
        <p className="text-[#6b7280] text-sm mt-1">
          Wallet que recibe fees + excedentes de overpaids. Desde acá se emiten reembolsos manuales a clientes que pagaron de más.
        </p>
      </header>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm">
          {error}
        </div>
      )}

      <section className="bg-white border border-[#e5e7eb] rounded-2xl p-5 sm:p-6 mb-6">
        <h2 className="text-[10px] uppercase tracking-widest text-[#9ca3af] font-mono mb-3">Estado</h2>
        {status === null ? (
          <div className="text-[#9ca3af] text-sm">Cargando…</div>
        ) : status.exists ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded border bg-emerald-500/10 border-emerald-500/20 text-emerald-700">
                creada
              </span>
              <span className="text-xs text-[#9ca3af]">
                {status.created_at && new Date(status.created_at).toLocaleDateString()}
              </span>
            </div>
            <a
              href={`https://stellar.expert/explorer/${EXPERT_SEG}/account/${status.public_key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block font-mono text-xs sm:text-sm text-[#005DB4] break-all bg-[#f0f7ff] border border-[#e5e7eb] rounded-lg px-3 py-2 hover:bg-[#e0f0ff]"
            >
              {status.public_key} ↗
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-[#6b7280]">
              No hay treasury todavía. {isMainnet ? 'En mainnet, pegá la secret key (S…) de una wallet pre-fondeada con ≥ 2 XLM.' : 'En testnet se fondea con Friendbot automáticamente.'}
            </div>
            {isMainnet && (
              <input
                type="password"
                value={setupSecret}
                onChange={e => setSetupSecret(e.target.value)}
                placeholder="S…"
                className="w-full px-3 py-2 bg-[#f0f7ff] border border-[#e5e7eb] rounded-lg text-sm font-mono focus:outline-none focus:border-[#005DB4]"
              />
            )}
            <button
              onClick={setupTreasury}
              disabled={setupRunning || (isMainnet && !setupSecret.trim())}
              className="px-4 py-2 rounded-lg bg-[#005DB4] hover:bg-[#0047a0] text-white text-sm font-semibold disabled:opacity-50"
            >
              {setupRunning ? 'Creando…' : 'Crear treasury'}
            </button>
          </div>
        )}
      </section>

      <section className="mb-6">
        <div className="flex items-end justify-between gap-3 mb-3">
          <h2 className="text-[10px] uppercase tracking-widest text-[#9ca3af] font-mono">
            Reembolsos pendientes
          </h2>
          <button
            onClick={loadRefundables}
            className="text-[10px] uppercase tracking-widest text-[#005DB4] hover:text-[#0047a0] font-mono"
          >
            Refrescar
          </button>
        </div>
        {refundables === null ? (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 text-[#9ca3af] text-sm">Cargando…</div>
        ) : refundables.length === 0 ? (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 text-center">
            <p className="text-sm text-[#6b7280]">Ningún cliente pagó de más sin recuperar.</p>
            <p className="text-xs text-[#9ca3af] mt-1">Cuando aparezca uno, vas a poder reembolsarlo con un click.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden">
            <div className="divide-y divide-[#e5e7eb]">
              {refundables.map(tx => {
                const expected = parseFloat(tx.amount_expected);
                const paid = parseFloat(tx.amount_paid);
                const excess = parseFloat(tx.excess);
                return (
                  <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium text-[#1a1a1a] truncate">
                          {tx.project_name || tx.project_id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-[#9ca3af]">·</span>
                        <span className="text-xs text-[#6b7280] truncate">{tx.reason || '—'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        <span className="text-[#9ca3af]">
                          Pagó <span className="font-mono text-[#1a1a1a]">{paid.toFixed(2)}</span> de <span className="font-mono">{expected.toFixed(2)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-amber-700 font-mono">
                          +{excess.toFixed(2)} a devolver
                        </span>
                        <span className="text-[#9ca3af] hidden sm:inline">
                          {fmtDate(tx.created_at)}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#9ca3af] font-mono mt-1 truncate">
                        tx {tx.id}
                      </div>
                    </div>
                    <button
                      onClick={() => fillFromRefundable(tx)}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-md bg-[#f0f7ff] hover:bg-[#e0f0ff] text-[#005DB4] font-medium"
                    >
                      Reembolsar ↓
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="bg-white border border-[#e5e7eb] rounded-2xl p-5 sm:p-6">
        <h2 className="text-[10px] uppercase tracking-widest text-[#9ca3af] font-mono mb-1">Reembolso manual</h2>
        <p className="text-xs text-[#6b7280] mb-4">
          Se envían los fondos desde la treasury al destinatario, y la transacción queda marcada como <code className="bg-[#f0f7ff] px-1 rounded">refunded</code>.
        </p>

        <form ref={formRef} onSubmit={submitRefund} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#6b7280] mb-1.5">
              Transaction ID
              <span className="text-xs text-[#9ca3af] font-normal ml-1">
                (clickea Reembolsar arriba para llenarlo automático)
              </span>
            </label>
            <input
              type="text"
              value={txId}
              onChange={e => setTxId(e.target.value)}
              required
              placeholder="uuid del cobro afectado"
              className="w-full px-3 py-2 bg-[#f0f7ff] border border-[#e5e7eb] rounded-lg text-sm font-mono focus:outline-none focus:border-[#005DB4]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6b7280] mb-1.5">Wallet destino (G…)</label>
            <input
              ref={destRef}
              type="text"
              value={dest}
              onChange={e => setDest(e.target.value)}
              required
              placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              className="w-full px-3 py-2 bg-[#f0f7ff] border border-[#e5e7eb] rounded-lg text-sm font-mono focus:outline-none focus:border-[#005DB4]"
            />
            <p className="text-xs text-[#9ca3af] mt-1">
              La wallet del cliente que reclamó — la tiene que mandar él por soporte.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6b7280] mb-1.5">Monto USDC</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              placeholder="25.00"
              className="w-full px-3 py-2 bg-[#f0f7ff] border border-[#e5e7eb] rounded-lg text-sm font-mono focus:outline-none focus:border-[#005DB4]"
            />
          </div>

          {refundResult && (
            <div
              className={`p-3 rounded-lg border text-sm ${
                refundResult.ok
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-700'
              }`}
            >
              {refundResult.msg}
            </div>
          )}

          <button
            type="submit"
            disabled={refundRunning || !status?.exists}
            className="w-full sm:w-auto px-5 py-2 rounded-lg bg-[#005DB4] hover:bg-[#0047a0] text-white text-sm font-semibold disabled:opacity-50"
          >
            {refundRunning ? 'Enviando…' : status?.exists ? 'Emitir reembolso' : 'Treasury no creada'}
          </button>
        </form>
      </section>
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

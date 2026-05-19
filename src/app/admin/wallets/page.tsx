'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

interface Wallet {
  public_key: string;
  wallet_type: 'pool' | 'treasury';
  wallet_index: number | null;
  is_locked: boolean;
  locked_until: string | null;
  last_project_id: string | null;
  created_at: string;
}

interface WalletBalance {
  public_key: string;
  wallet_type: 'pool' | 'treasury';
  wallet_index: number | null;
  is_locked: boolean;
  xlm_balance: string;
  usdc_balance: string;
  xlm_status: 'ok' | 'warning' | 'critical' | 'error';
  horizon_error: string | null;
}

interface BalancesSummary {
  total: number;
  critical: number;
  warning: number;
  ok: number;
  error: number;
  total_usdc_in_pool: string;
  total_usdc_in_treasury: string;
}

const NETWORK = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET').toUpperCase();
const EXPERT_SEG = NETWORK === 'MAINNET' ? 'public' : 'testnet';

export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [balances, setBalances] = useState<Record<string, WalletBalance>>({});
  const [summary, setSummary] = useState<BalancesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);

  const loadWallets = useCallback(async () => {
    try {
      const r = await adminFetch<{ data: { wallets: Wallet[] } }>('/api/proxy/wallets');
      setWallets(r.data.wallets);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBalances = useCallback(async () => {
    setLoadingBalances(true);
    try {
      const r = await adminFetch<{ data: { summary: BalancesSummary; wallets: WalletBalance[] } }>('/api/proxy/wallets/balances');
      const m: Record<string, WalletBalance> = {};
      for (const w of r.data.wallets) m[w.public_key] = w;
      setBalances(m);
      setSummary(r.data.summary);
    } catch (e: unknown) {
      // No bloquea — la lista de wallets sigue mostrándose
      console.error('balances failed', e);
    } finally {
      setLoadingBalances(false);
    }
  }, []);

  useEffect(() => {
    loadWallets();
    loadBalances();
    const t = setInterval(() => {
      loadWallets();
      loadBalances();
    }, 30000);
    return () => clearInterval(t);
  }, [loadWallets, loadBalances]);

  const createWallet = async () => {
    if (!confirm('¿Crear una wallet nueva en el pool? Se fondea con Friendbot (solo testnet).')) return;
    setCreating(true);
    setError(null);
    try {
      await adminFetch('/api/proxy/wallets', { method: 'POST' });
      await Promise.all([loadWallets(), loadBalances()]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  const removeWallet = async (publicKey: string) => {
    if (!confirm(`¿Eliminar wallet del pool?\n\n${publicKey}\n\nLa cuenta Stellar sigue existiendo on-chain pero deja de rotar.`)) return;
    setDeleting(publicKey);
    setError(null);
    try {
      await adminFetch('/api/proxy/wallets', {
        method: 'DELETE',
        body: JSON.stringify({ public_key: publicKey }),
      });
      await Promise.all([loadWallets(), loadBalances()]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(null);
    }
  };

  const poolWallets = wallets.filter(w => w.wallet_type === 'pool');
  const treasuryWallets = wallets.filter(w => w.wallet_type === 'treasury');

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#9ca3af] font-mono mb-1.5">
              <span>Pollar Pay</span>
              <span className="text-[#e5e7eb]">·</span>
              <span>Wallets on-chain</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Wallets</h1>
            <p className="text-[#6b7280] text-sm mt-1">
              Pool de cobro + treasury. Balances en vivo desde Horizon.
            </p>
          </div>
          <button
            onClick={createWallet}
            disabled={creating}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#005DB4] hover:bg-[#0047a0] text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {creating ? 'Creando…' : 'Nueva wallet pool'}
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Stat label="Pool USDC" value={parseFloat(summary.total_usdc_in_pool).toFixed(2)} />
          <Stat label="Treasury USDC" value={parseFloat(summary.total_usdc_in_treasury).toFixed(2)} />
          <Stat label="OK" value={summary.ok.toString()} color="emerald" />
          <Stat label="XLM bajo" value={(summary.warning + summary.critical).toString()} color={summary.critical > 0 ? 'rose' : summary.warning > 0 ? 'amber' : undefined} />
          <Stat label="Error Horizon" value={summary.error.toString()} color={summary.error > 0 ? 'rose' : undefined} />
        </div>
      )}

      {loading ? (
        <div className="text-[#9ca3af] text-sm">Cargando…</div>
      ) : (
        <>
          {treasuryWallets.length > 0 && (
            <Section title="Treasury">
              <WalletTable
                wallets={treasuryWallets}
                balances={balances}
                expertSeg={EXPERT_SEG}
                onDelete={null}
                deletingKey={deleting}
                loadingBalances={loadingBalances}
              />
            </Section>
          )}

          <Section title={`Pool (${poolWallets.length})`}>
            {poolWallets.length === 0 ? (
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 text-center text-[#9ca3af] text-sm">
                No hay wallets en el pool. Creá la primera arriba.
              </div>
            ) : (
              <WalletTable
                wallets={poolWallets}
                balances={balances}
                expertSeg={EXPERT_SEG}
                onDelete={removeWallet}
                deletingKey={deleting}
                loadingBalances={loadingBalances}
              />
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 sm:mb-8">
      <h2 className="font-semibold text-[10px] uppercase tracking-widest text-[#9ca3af] font-mono mb-2 px-1">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: 'emerald' | 'amber' | 'rose' }) {
  const colorClass =
    color === 'emerald' ? 'text-emerald-700' :
    color === 'amber'   ? 'text-amber-700'   :
    color === 'rose'    ? 'text-rose-700'    : 'text-[#1a1a1a]';
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-xl px-3 py-3">
      <div className="text-xs text-[#9ca3af]">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${colorClass}`}>{value}</div>
    </div>
  );
}

function WalletTable({
  wallets,
  balances,
  expertSeg,
  onDelete,
  deletingKey,
  loadingBalances,
}: {
  wallets: Wallet[];
  balances: Record<string, WalletBalance>;
  expertSeg: string;
  onDelete: ((publicKey: string) => void) | null;
  deletingKey: string | null;
  loadingBalances: boolean;
}) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden">
      {/* mobile cards */}
      <div className="md:hidden divide-y divide-[#e5e7eb]">
        {wallets.map(w => {
          const b = balances[w.public_key];
          const isPool = w.wallet_type === 'pool';
          return (
            <div key={w.public_key} className="p-4">
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-xs text-[#9ca3af] font-mono shrink-0">
                  {w.wallet_index !== null ? `#${w.wallet_index}` : 'treasury'}
                </span>
                {isPool && <LockBadge locked={w.is_locked} />}
                {b && <XlmBadge status={b.xlm_status} />}
              </div>
              <a
                href={`https://stellar.expert/explorer/${expertSeg}/account/${w.public_key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block font-mono text-[11px] text-[#005DB4] break-all mb-2"
              >
                {w.public_key} ↗
              </a>
              <div className="flex items-center justify-between text-sm">
                <div className="text-xs text-[#6b7280]">
                  XLM: <span className="font-mono">{b ? parseFloat(b.xlm_balance).toFixed(2) : (loadingBalances ? '…' : '—')}</span>
                </div>
                <div className="font-mono font-semibold">
                  {b ? parseFloat(b.usdc_balance).toFixed(2) : (loadingBalances ? '…' : '—')} <span className="text-[10px] text-[#9ca3af]">USDC</span>
                </div>
              </div>
              {onDelete && (
                <button
                  onClick={() => onDelete(w.public_key)}
                  disabled={w.is_locked || deletingKey === w.public_key}
                  className="mt-3 w-full text-xs px-3 py-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deletingKey === w.public_key ? 'Eliminando…' : w.is_locked ? 'Lockeada — esperá' : 'Eliminar del pool'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#9ca3af] border-b border-[#e5e7eb]">
              <th className="px-5 py-3 font-medium">Idx</th>
              <th className="px-5 py-3 font-medium">Wallet</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium text-right">XLM</th>
              <th className="px-5 py-3 font-medium text-right">USDC</th>
              {onDelete && <th className="px-5 py-3 font-medium"></th>}
            </tr>
          </thead>
          <tbody>
            {wallets.map(w => {
              const b = balances[w.public_key];
              const isPool = w.wallet_type === 'pool';
              return (
                <tr key={w.public_key} className="border-b border-[#e5e7eb] last:border-0">
                  <td className="px-5 py-3 text-xs text-[#6b7280] font-mono">
                    {w.wallet_index !== null ? `#${w.wallet_index}` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <a
                      href={`https://stellar.expert/explorer/${expertSeg}/account/${w.public_key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-[#005DB4] hover:text-[#0047a0]"
                    >
                      {w.public_key.slice(0, 8)}…{w.public_key.slice(-6)} ↗
                    </a>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isPool && <LockBadge locked={w.is_locked} />}
                      {b && <XlmBadge status={b.xlm_status} />}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right font-mono">
                    {b ? parseFloat(b.xlm_balance).toFixed(2) : (loadingBalances ? '…' : '—')}
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-semibold">
                    {b ? parseFloat(b.usdc_balance).toFixed(2) : (loadingBalances ? '…' : '—')}
                  </td>
                  {onDelete && (
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => onDelete(w.public_key)}
                        disabled={w.is_locked || deletingKey === w.public_key}
                        className="text-xs px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {deletingKey === w.public_key ? '…' : 'Eliminar'}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LockBadge({ locked }: { locked: boolean }) {
  return locked ? (
    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-amber-500/10 border-amber-500/20 text-amber-700">en uso</span>
  ) : (
    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-emerald-500/10 border-emerald-500/20 text-emerald-700">libre</span>
  );
}

function XlmBadge({ status }: { status: 'ok' | 'warning' | 'critical' | 'error' }) {
  if (status === 'ok') return null;
  const cls =
    status === 'critical' ? 'bg-rose-500/10 border-rose-500/20 text-rose-700' :
    status === 'warning'  ? 'bg-amber-500/10 border-amber-500/20 text-amber-700' :
                            'bg-[#f0f7ff] border-[#e5e7eb] text-[#6b7280]';
  const label =
    status === 'critical' ? 'XLM crítico' :
    status === 'warning'  ? 'XLM bajo'    : 'Horizon error';
  return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cls}`}>{label}</span>;
}

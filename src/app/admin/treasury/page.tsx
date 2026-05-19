'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

interface TreasuryStatus {
  exists: boolean;
  public_key?: string;
  created_at?: string;
}

const NETWORK = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'TESTNET').toUpperCase();
const EXPERT_SEG = NETWORK === 'MAINNET' ? 'public' : 'testnet';
const isMainnet = NETWORK === 'MAINNET';

export default function AdminTreasuryPage() {
  const [status, setStatus] = useState<TreasuryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Setup inicial (cuando todavía no hay treasury) — testnet automático, mainnet requiere secret
  const [setupSecret, setSetupSecret] = useState('');
  const [setupRunning, setSetupRunning] = useState(false);

  // Rotate (cambiar treasury existente)
  const [showRotate, setShowRotate] = useState(false);
  const [rotatePubkey, setRotatePubkey] = useState('');
  const [rotateSecret, setRotateSecret] = useState('');
  const [rotateRunning, setRotateRunning] = useState(false);
  const [rotateResult, setRotateResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const rotatePubRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await adminFetch<TreasuryStatus>('/api/proxy/treasury');
      setStatus(r);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setupTreasury = async () => {
    if (isMainnet && !setupSecret.trim()) {
      setError('En mainnet hay que pasar una secret key pre-fondeada (≥ 2 XLM).');
      return;
    }
    if (!confirm(`¿Crear la treasury wallet?\n\n${isMainnet ? 'Mainnet: usa la secret key provista.' : 'Testnet: se fondea con Friendbot.'}\n\nOperación única — una vez creada, para cambiarla usá "Rotar treasury".`)) return;
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

  const openRotate = () => {
    setShowRotate(true);
    setRotateResult(null);
    setRotatePubkey('');
    setRotateSecret('');
    setTimeout(() => rotatePubRef.current?.focus(), 50);
  };

  const submitRotate = async (e: React.FormEvent) => {
    e.preventDefault();
    setRotateResult(null);
    const pk = rotatePubkey.trim();
    const sk = rotateSecret.trim();
    if (!/^G[A-Z2-7]{55}$/.test(pk)) {
      setRotateResult({ ok: false, msg: 'public_key inválida (G + 55 chars)' });
      return;
    }
    if (sk && !/^S[A-Z2-7]{55}$/.test(sk)) {
      setRotateResult({ ok: false, msg: 'secret_key inválida (S + 55 chars)' });
      return;
    }
    if (!confirm(
      `⚠️ ROTAR TREASURY\n\n` +
      `Nueva pubkey: ${pk}\n` +
      `Secret incluida: ${sk ? 'sí' : 'no (solo recibirá)'}\n\n` +
      `Esto cambia inmediatamente dónde van los fees + cobros Scale futuros.\n` +
      `Asegurate de que la nueva wallet tenga trustline USDC.\n\n` +
      `La treasury anterior queda con sus fondos históricos — moverlos es manual.\n\n` +
      `¿Confirmar rotación?`,
    )) return;

    setRotateRunning(true);
    try {
      const r = await adminFetch<{ success: boolean; new_treasury?: string; message?: string }>(
        '/api/proxy/treasury/rotate',
        {
          method: 'POST',
          body: JSON.stringify({
            public_key: pk,
            secret_key: sk || undefined,
          }),
        },
      );
      setRotateResult({ ok: true, msg: r.message || `Treasury rotada a ${r.new_treasury?.slice(0, 10)}…` });
      setRotatePubkey('');
      setRotateSecret('');
      await load();
    } catch (e: unknown) {
      setRotateResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setRotateRunning(false);
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
          Wallet que recibe fees + excedentes de overpaids + cobros de Scale ($25/mes).
        </p>
      </header>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 text-sm">
          {error}
        </div>
      )}

      {/* ── Status ───────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#e5e7eb] rounded-2xl p-5 sm:p-6 mb-6">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h2 className="text-[10px] uppercase tracking-widest text-[#9ca3af] font-mono">Estado</h2>
          {status?.exists && (
            <button
              onClick={openRotate}
              className="text-xs px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 font-medium"
            >
              Rotar treasury
            </button>
          )}
        </div>

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

      {/* ── Rotate form (modal-ish inline) ───────────────────────────── */}
      {showRotate && status?.exists && (
        <section className="bg-white border border-amber-500/30 ring-1 ring-amber-500/10 rounded-2xl p-5 sm:p-6 mb-6">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h2 className="text-[10px] uppercase tracking-widest text-amber-700 font-mono mb-1">
                ⚠ Rotar treasury — operación de emergencia
              </h2>
              <p className="text-xs text-[#6b7280]">
                Solo para casos de filtración / hackeo de la secret actual. Generá una wallet nueva en Lobstr/Stellar Lab, agregale trustline USDC, y pegá su pubkey acá. El billing project se sincroniza automáticamente.
              </p>
            </div>
            <button
              onClick={() => setShowRotate(false)}
              className="text-[#9ca3af] hover:text-[#1a1a1a] text-xl leading-none -mt-1"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          <form onSubmit={submitRotate} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-[#6b7280] mb-1.5">Nueva public key (G…)</label>
              <input
                ref={rotatePubRef}
                type="text"
                value={rotatePubkey}
                onChange={e => setRotatePubkey(e.target.value)}
                placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                required
                spellCheck={false}
                className="w-full px-3 py-2 bg-[#f0f7ff] border border-[#e5e7eb] rounded-lg text-sm font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#6b7280] mb-1.5">
                Secret key <span className="text-[#9ca3af] font-normal">(opcional — recomendado dejarla vacía)</span>
              </label>
              <input
                type="password"
                value={rotateSecret}
                onChange={e => setRotateSecret(e.target.value)}
                placeholder="S… (opcional)"
                spellCheck={false}
                className="w-full px-3 py-2 bg-[#f0f7ff] border border-[#e5e7eb] rounded-lg text-sm font-mono focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-[#9ca3af] mt-1">
                Sin secret = más seguro (la guardás vos en vault). Con secret = backend puede firmar refunds automáticos en el futuro.
              </p>
            </div>

            {rotateResult && (
              <div className={`p-2.5 rounded-lg border text-sm ${
                rotateResult.ok
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-700'
              }`}>{rotateResult.msg}</div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={rotateRunning || !rotatePubkey.trim()}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                {rotateRunning ? 'Rotando…' : 'Confirmar rotación'}
              </button>
              <button
                type="button"
                onClick={() => setShowRotate(false)}
                className="px-4 py-2 rounded-lg bg-[#f0f7ff] hover:bg-[#e0f0ff] text-[#005DB4] text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ── Nota sobre refunds ──────────────────────────────────────── */}
      <section className="bg-[#f0f7ff] border border-[#e5e7eb] rounded-2xl p-4 sm:p-5">
        <h3 className="text-[10px] uppercase tracking-widest text-[#9ca3af] font-mono mb-2">¿Y los refunds?</h3>
        <p className="text-xs text-[#6b7280] leading-relaxed">
          Los reembolsos a clientes que pagaron de más se resuelven <b>off-system</b> — muchos pagos vienen
          desde Binance/exchanges donde la wallet origen no es del cliente. Para gestionarlos andá a{' '}
          <code className="bg-white px-1.5 py-0.5 rounded text-[11px] border border-[#e5e7eb]">/admin/anomalies</code>{' '}
          → sección "Overpaids" → clickeás <b>Comprobado</b> cuando hablaste con el cliente y resolviste por whatsapp, descontaste del próximo cobro, etc.
        </p>
      </section>
    </div>
  );
}

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ErrorNote, Panel, Toggle } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useLive } from '../hooks/live';
import { api } from '../lib/api';
import { MARKET_LABEL } from '../lib/format';
import type {
  BotStatus,
  CostConfig,
  MarketId,
  RiskConfig,
  Settings as SettingsT,
  StrategyInfo,
} from '../lib/types';

const COST_FIELDS: { key: keyof CostConfig; label: string; step: number; hint?: string }[] = [
  { key: 'feePct', label: 'Fee %', step: 0.001 },
  { key: 'feeFixed', label: 'Fixed fee', step: 0.01 },
  { key: 'feeMin', label: 'Min fee', step: 0.01 },
  { key: 'spreadPct', label: 'Spread %', step: 0.01 },
  { key: 'slippagePct', label: 'Slippage %', step: 0.01 },
  { key: 'delayMs', label: 'Delay (ms)', step: 50 },
  { key: 'failChance', label: 'Fail chance (0–1)', step: 0.005 },
];

const RISK_FIELDS: {
  key: Exclude<keyof RiskConfig, 'killSwitch'>;
  label: string;
  step: number;
  hint: string;
}[] = [
  { key: 'maxTradePct', label: 'Max trade size (% of equity)', step: 1, hint: 'Per new position' },
  {
    key: 'maxTradeValue',
    label: 'Max trade value (0 = off)',
    step: 10,
    hint: 'In wallet currency',
  },
  {
    key: 'dailyLossLimitPct',
    label: 'Daily loss limit %',
    step: 0.5,
    hint: 'Stops new entries for the day',
  },
  { key: 'maxOpenPositions', label: 'Max open positions', step: 1, hint: 'Per wallet' },
];

export function Settings() {
  const remote = useApi<SettingsT>('/settings');
  const strategies = useApi<StrategyInfo[]>('/strategies');
  const { status, setStatus } = useLive();
  const [draft, setDraft] = useState<SettingsT | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (remote.data) setDraft(structuredClone(remote.data));
  }, [remote.data]);

  async function save(patch: Partial<SettingsT>, note = 'Saved') {
    setError(null);
    setMsg(null);
    try {
      const next = await api<SettingsT>('/settings', { method: 'PUT', body: patch });
      remote.setData(next);
      setMsg(note);
      setStatus(await api<BotStatus>('/bot/status'));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function killSwitch(on: boolean) {
    if (
      on &&
      !confirm('Engage the KILL SWITCH? All markets stop trading immediately, including exits.')
    )
      return;
    if (on) await api('/bot/stop', { method: 'POST' }).catch(() => undefined);
    await save(
      { risk: { ...draft!.risk, killSwitch: on } },
      on ? 'Kill switch ENGAGED. All trading halted.' : 'Kill switch released.',
    );
  }

  async function resetWallets() {
    if (!confirm('Reset ALL paper wallets to their starting cash? Trade history is kept.')) return;
    try {
      const r = await api<{ reset: number }>('/wallets/reset', { method: 'POST', body: {} });
      setMsg(`Reset ${r.reset} wallets`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!draft) return <ErrorNote error={remote.error} />;
  const killOn = draft.risk.killSwitch;
  const num = (v: string) => (v === '' ? 0 : Number(v));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black tracking-wide md:text-3xl">Settings</h1>

      <motion.div
        animate={
          killOn ? { boxShadow: ['0 0 0px #f87171', '0 0 40px #f87171', '0 0 0px #f87171'] } : {}
        }
        transition={{ repeat: Infinity, duration: 2 }}
        className={`panel flex flex-col items-center gap-3 border-2 text-center ${killOn ? 'border-loss bg-loss/10' : 'border-loss/40'}`}
      >
        <span className="label text-loss">Emergency</span>
        <button
          onClick={() => killSwitch(!killOn)}
          className={`h-28 w-28 rounded-full border-4 font-display text-sm font-black tracking-widest transition active:scale-95 ${
            killOn
              ? 'border-loss bg-loss text-void shadow-glow-loss'
              : 'border-loss bg-loss/20 text-loss hover:bg-loss/40 hover:shadow-glow-loss'
          }`}
          aria-pressed={killOn}
        >
          {killOn ? 'RELEASE' : 'KILL SWITCH'}
        </button>
        <p className="max-w-md text-xs text-slate-400">
          {killOn
            ? 'All trading is halted. The bot cannot be started until you release it.'
            : 'Stops the bot and blocks every new trade on every market.'}
        </p>
      </motion.div>

      {msg && (
        <div className="rounded-lg border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">
          {msg}
        </div>
      )}
      <ErrorNote error={error} />

      <Panel
        title="Risk limits"
        action={
          <button
            className="btn-primary px-3 py-1 text-xs"
            onClick={() => save({ risk: draft.risk })}
          >
            Save
          </button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {RISK_FIELDS.map((f) => (
            <label key={f.key} className="block space-y-1">
              <span className="label">{f.label}</span>
              <input
                className="input num"
                type="number"
                step={f.step}
                value={draft.risk[f.key]}
                onChange={(e) =>
                  setDraft({ ...draft, risk: { ...draft.risk, [f.key]: num(e.target.value) } })
                }
              />
              <span className="text-[11px] text-slate-500">{f.hint}</span>
            </label>
          ))}
        </div>
      </Panel>

      <Panel
        title="Strategies"
        action={
          <button
            className="btn-primary px-3 py-1 text-xs"
            onClick={() =>
              save({ strategies: draft.strategies, candleInterval: draft.candleInterval })
            }
          >
            Save
          </button>
        }
      >
        <label className="mb-4 flex items-center gap-3 text-sm">
          <span className="label">Live candle interval</span>
          <select
            className="input w-auto"
            value={draft.candleInterval}
            onChange={(e) =>
              setDraft({ ...draft, candleInterval: e.target.value as SettingsT['candleInterval'] })
            }
          >
            {['1m', '5m', '15m', '1h'].map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 lg:grid-cols-2">
          {(strategies.data ?? []).map((s) => {
            const cur = draft.strategies[s.id];
            if (!cur) return null;
            const set = (patch: Partial<typeof cur>) =>
              setDraft({
                ...draft,
                strategies: { ...draft.strategies, [s.id]: { ...cur, ...patch } },
              });
            return (
              <div key={s.id} className="rounded-xl border border-edge bg-void/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {s.markets === 'all'
                        ? 'All markets'
                        : s.markets.map((m) => MARKET_LABEL[m]).join(', ')}
                    </div>
                  </div>
                  <Toggle
                    checked={cur.enabled}
                    onChange={(v) => set({ enabled: v })}
                    label={`Enable ${s.name}`}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">{s.description}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {s.params.map((p) => (
                    <label key={p.key} className="block space-y-1">
                      <span className="text-[11px] text-slate-400">{p.label}</span>
                      <input
                        className="input num py-1"
                        type="number"
                        min={p.min}
                        max={p.max}
                        step={p.step}
                        value={cur.params[p.key] ?? p.default}
                        onChange={(e) =>
                          set({ params: { ...cur.params, [p.key]: num(e.target.value) } })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Costs per market"
        action={
          <button
            className="btn-primary px-3 py-1 text-xs"
            onClick={() => save({ costs: draft.costs })}
          >
            Save
          </button>
        }
      >
        <p className="mb-3 text-xs text-slate-400">
          Percent fields are in percent (0.1 = 0.1%). Keep these pessimistic: paper results should
          never look better than reality.
        </p>
        <div className="space-y-4">
          {(Object.keys(draft.costs) as MarketId[]).map((m) => {
            const c = draft.costs[m];
            const set = (patch: Partial<CostConfig>) =>
              setDraft({ ...draft, costs: { ...draft.costs, [m]: { ...c, ...patch } } });
            return (
              <div key={m} className="rounded-xl border border-edge bg-void/40 p-3">
                <div className="mb-2 font-semibold">{MARKET_LABEL[m]}</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {COST_FIELDS.map((f) => (
                    <label key={f.key} className="block space-y-1">
                      <span className="text-[11px] text-slate-400">{f.label}</span>
                      <input
                        className="input num py-1"
                        type="number"
                        step={f.step}
                        min={0}
                        value={c[f.key] as number}
                        onChange={(e) => set({ [f.key]: num(e.target.value) })}
                      />
                    </label>
                  ))}
                </div>
                {c.taxes.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {c.taxes.map((t, i) => (
                      <label key={t.name} className="block space-y-1">
                        <span className="text-[11px] text-slate-400">
                          {t.name} ({t.side},{' '}
                          {t.base === 'fees' ? '% of fees' : t.fixed ? 'fixed' : '%'})
                        </span>
                        <input
                          className="input num py-1"
                          type="number"
                          step={0.001}
                          min={0}
                          value={t.fixed ?? t.pct}
                          onChange={(e) =>
                            set({
                              taxes: c.taxes.map((x, j) =>
                                j !== i
                                  ? x
                                  : x.fixed !== undefined
                                    ? { ...x, fixed: num(e.target.value) }
                                    : { ...x, pct: num(e.target.value) },
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Wallets">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn-ghost border-loss/50 text-loss"
            onClick={resetWallets}
            disabled={!!status?.running}
          >
            Reset all paper wallets
          </button>
          {status?.running && <span className="text-xs text-slate-500">Stop the bot first.</span>}
        </div>
      </Panel>
    </div>
  );
}

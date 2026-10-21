import { motion } from 'framer-motion';
import { CircleCheck, OctagonX, RotateCcw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Term } from '@/components/Term';
import { ErrorNote, Note, PageHeader, Panel, Toggle } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GUIDE_BY_ID, strategyName } from '@/content/strategies';
import { useApi } from '@/hooks/useApi';
import { useLive } from '@/hooks/live';
import { type TKey, useLang } from '@/i18n';
import { api } from '@/lib/api';
import { MARKET_LABEL } from '@/lib/format';
import type {
  BotStatus,
  CostConfig,
  MarketId,
  RiskConfig,
  Settings as SettingsT,
  StrategyInfo,
} from '@/lib/types';
import { cn } from '@/lib/utils';

const COST_FIELDS: { key: keyof CostConfig; label: TKey; term: string; step: number }[] = [
  { key: 'feePct', label: 'set.cost.feePct', term: 'fees', step: 0.001 },
  { key: 'feeFixed', label: 'set.cost.feeFixed', term: 'fees', step: 0.01 },
  { key: 'feeMin', label: 'set.cost.feeMin', term: 'fees', step: 0.01 },
  { key: 'spreadPct', label: 'set.cost.spread', term: 'spread', step: 0.01 },
  { key: 'slippagePct', label: 'set.cost.slippage', term: 'slippage', step: 0.01 },
  { key: 'delayMs', label: 'set.cost.delay', term: 'delay', step: 50 },
  { key: 'failChance', label: 'set.cost.fail', term: 'failed-order', step: 0.005 },
];

const RISK_FIELDS: {
  key: Exclude<keyof RiskConfig, 'killSwitch'>;
  label: TKey;
  hint: TKey;
  term: string;
  step: number;
}[] = [
  {
    key: 'maxTradePct',
    label: 'set.risk.maxTradePct',
    hint: 'set.risk.maxTradePctHint',
    term: 'position-size',
    step: 1,
  },
  {
    key: 'maxTradeValue',
    label: 'set.risk.maxTradeValue',
    hint: 'set.risk.maxTradeValueHint',
    term: 'position-size',
    step: 10,
  },
  {
    key: 'dailyLossLimitPct',
    label: 'set.risk.daily',
    hint: 'set.risk.dailyHint',
    term: 'daily-loss-limit',
    step: 0.5,
  },
  {
    key: 'maxOpenPositions',
    label: 'set.risk.maxOpen',
    hint: 'set.risk.maxOpenHint',
    term: 'max-open-positions',
    step: 1,
  },
];

export function Settings() {
  const { t, pick } = useLang();
  const remote = useApi<SettingsT>('/settings');
  const strategies = useApi<StrategyInfo[]>('/strategies');
  const { status, setStatus } = useLive();
  const [draft, setDraft] = useState<SettingsT | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (remote.data) setDraft(structuredClone(remote.data));
  }, [remote.data]);

  async function save(patch: Partial<SettingsT>, note = t('set.saved')) {
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
    if (on && !confirm(t('set.kill.confirm'))) return;
    if (on) await api('/bot/stop', { method: 'POST' }).catch(() => undefined);
    await save(
      { risk: { ...draft!.risk, killSwitch: on } },
      on ? t('set.kill.engaged') : t('set.kill.released'),
    );
  }

  async function resetWallets() {
    if (!confirm(t('set.reset.confirm'))) return;
    try {
      const r = await api<{ reset: number }>('/wallets/reset', { method: 'POST', body: {} });
      setMsg(t('set.reset.done', { n: r.reset }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!draft) return <ErrorNote error={remote.error} />;
  const killOn = draft.risk.killSwitch;
  const num = (v: string) => (v === '' ? 0 : Number(v));
  const SaveBtn = ({ onClick }: { onClick(): void }) => (
    <Button size="sm" onClick={onClick}>
      <Save /> {t('common.save')}
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t('set.title')} intro={t('set.intro')} />

      <motion.div
        animate={killOn ? { scale: [1, 1.01, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
        className={cn(
          'panel flex flex-col items-center gap-3 border-2 text-center sm:flex-row sm:text-left',
          killOn ? 'border-loss bg-loss/10' : 'border-loss/30',
        )}
      >
        <button
          onClick={() => killSwitch(!killOn)}
          className={cn(
            'grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-loss font-display text-xs font-extrabold uppercase tracking-wider transition active:scale-95',
            killOn ? 'bg-loss text-white' : 'bg-loss/10 text-loss hover:bg-loss/20',
          )}
          aria-pressed={killOn}
        >
          <span className="flex flex-col items-center gap-1">
            <OctagonX className="h-6 w-6" />
            {killOn ? t('set.kill.release') : t('set.kill.button')}
          </span>
        </button>
        <div className="space-y-1">
          <div className="font-display text-lg font-bold">
            <Term id="kill-switch">{t('set.kill.title')}</Term>
          </div>
          <p className="text-sm text-muted-foreground">
            {killOn ? t('set.kill.onHint') : t('set.kill.offHint')}
          </p>
        </div>
      </motion.div>

      {msg && (
        <div className="flex items-center gap-2 rounded-xl border border-win/30 bg-win/10 px-3 py-2 text-sm text-win">
          <CircleCheck className="h-4 w-4" /> {msg}
        </div>
      )}
      <ErrorNote error={error} />

      <Panel
        title={<Term id="risk">{t('set.risk.title')}</Term>}
        hint={t('set.risk.hint')}
        action={<SaveBtn onClick={() => save({ risk: draft.risk })} />}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {RISK_FIELDS.map((f) => (
            <label key={f.key} className="block space-y-1.5">
              <span className="text-sm font-medium">
                <Term id={f.term}>{t(f.label)}</Term>
              </span>
              <Input
                className="num"
                type="number"
                step={f.step}
                value={draft.risk[f.key]}
                onChange={(e) =>
                  setDraft({ ...draft, risk: { ...draft.risk, [f.key]: num(e.target.value) } })
                }
              />
              <span className="block text-xs text-muted-foreground">{t(f.hint)}</span>
            </label>
          ))}
        </div>
      </Panel>

      <Panel
        title={<Term id="strategy">{t('set.strat.title')}</Term>}
        hint={t('set.strat.hint')}
        action={
          <SaveBtn
            onClick={() =>
              save({ strategies: draft.strategies, candleInterval: draft.candleInterval })
            }
          />
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium">
            <Term id="timeframe">{t('set.strat.interval')}</Term>
          </span>
          <Select
            value={draft.candleInterval}
            onValueChange={(v) =>
              setDraft({ ...draft, candleInterval: v as SettingsT['candleInterval'] })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['1m', '5m', '15m', '1h'] as const).map((i) => (
                <SelectItem key={i} value={i}>
                  {t(`tf.${i}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {(strategies.data ?? []).map((s) => {
            const cur = draft.strategies[s.id];
            if (!cur) return null;
            const guide = GUIDE_BY_ID.get(s.id);
            const set = (patch: Partial<typeof cur>) =>
              setDraft({
                ...draft,
                strategies: { ...draft.strategies, [s.id]: { ...cur, ...patch } },
              });
            return (
              <div key={s.id} className="rounded-2xl border bg-background p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">
                      {guide?.icon} {strategyName(s.id, pick)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.markets === 'all'
                        ? t('common.allMarkets')
                        : s.markets.map((m) => MARKET_LABEL[m]).join(', ')}
                    </div>
                  </div>
                  <Toggle
                    checked={cur.enabled}
                    onChange={(v) => set({ enabled: v })}
                    label={t('set.strat.enable', { name: strategyName(s.id, pick) })}
                  />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {guide
                    ? pick(guide.oneLiner)
                    : s.id === 'user'
                      ? t('set.strat.userHint')
                      : s.description}
                </p>
                {s.params.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {s.params.map((p) => (
                      <label key={p.key} className="block space-y-1">
                        <span className="text-xs text-muted-foreground">
                          {guide?.paramLabels?.[p.key] ? pick(guide.paramLabels[p.key]) : p.label}
                        </span>
                        <Input
                          className="num h-9"
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
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        title={t('set.cost.title')}
        hint={t('set.cost.hint')}
        action={<SaveBtn onClick={() => save({ costs: draft.costs })} />}
      >
        <div className="space-y-4">
          {(Object.keys(draft.costs) as MarketId[]).map((m) => {
            const c = draft.costs[m];
            const set = (patch: Partial<CostConfig>) =>
              setDraft({ ...draft, costs: { ...draft.costs, [m]: { ...c, ...patch } } });
            return (
              <div key={m} className="rounded-2xl border bg-background p-4">
                <div className="mb-3 font-semibold">{MARKET_LABEL[m]}</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  {COST_FIELDS.map((f) => (
                    <label key={f.key} className="block space-y-1">
                      <span className="text-xs text-muted-foreground">
                        <Term id={f.term}>{t(f.label)}</Term>
                      </span>
                      <Input
                        className="num h-9"
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
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {c.taxes.map((x, i) => (
                      <label key={x.name} className="block space-y-1">
                        <span className="text-xs text-muted-foreground">
                          <Term id="taxes">{x.name}</Term> (
                          {x.side === 'both'
                            ? t('set.tax.both')
                            : x.side === 'buy'
                              ? t('common.buy')
                              : t('common.sell')}
                          ,{' '}
                          {x.base === 'fees'
                            ? t('set.tax.ofFees')
                            : x.fixed
                              ? t('set.tax.fixed')
                              : '%'}
                          )
                        </span>
                        <Input
                          className="num h-9"
                          type="number"
                          step={0.001}
                          min={0}
                          value={x.fixed ?? x.pct}
                          onChange={(e) =>
                            set({
                              taxes: c.taxes.map((y, j) =>
                                j !== i
                                  ? y
                                  : y.fixed !== undefined
                                    ? { ...y, fixed: num(e.target.value) }
                                    : { ...y, pct: num(e.target.value) },
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

      <Panel title={<Term id="wallet">{t('set.wallets.title')}</Term>} hint={t('set.wallets.hint')}>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="destructive" onClick={resetWallets} disabled={!!status?.running}>
            <RotateCcw /> {t('set.wallets.reset')}
          </Button>
          {status?.running && (
            <span className="text-xs text-muted-foreground">{t('common.stopFirst')}</span>
          )}
        </div>
      </Panel>
      <Note>
        <p>{t('set.footer')}</p>
      </Note>
    </div>
  );
}

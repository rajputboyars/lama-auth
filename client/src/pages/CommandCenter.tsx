import { useEffect, useState } from 'react';
import { BotControls } from '../components/BotControls';
import { EquityChart } from '../components/EquityChart';
import { PriceTicker } from '../components/PriceTicker';
import { XPBar } from '../components/XPBar';
import { ErrorNote, PaperBanner, Panel, Stat } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useLive } from '../hooks/live';
import { money, pct, tone } from '../lib/format';
import type { Currency, Profile, Stats } from '../lib/types';

export function CommandCenter() {
  const { walletTick, trades } = useLive();
  const stats = useApi<Stats>('/stats', { pollMs: 30_000, deps: [trades.length] });
  const profile = useApi<Profile>('/game/profile', { pollMs: 60_000 });
  const currencies = Object.keys(stats.data?.totals ?? {}) as Currency[];
  const [cur, setCur] = useState<Currency>('USD');

  // Refresh balances at most every 5s when wallets tick.
  useEffect(() => {
    const t = setTimeout(() => void stats.reload(), 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletTick]);

  useEffect(() => {
    if (currencies.length && !currencies.includes(cur)) setCur(currencies[0]);
  }, [currencies, cur]);

  const total = stats.data?.totals[cur];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="font-display text-2xl font-black tracking-wide md:text-3xl">
          Command Center
        </h1>
        <div className="flex gap-1" role="tablist" aria-label="Currency">
          {currencies.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={c === cur}
              onClick={() => setCur(c)}
              className={c === cur ? 'btn-primary px-3 py-1' : 'btn-ghost px-3 py-1'}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <PaperBanner />
      <ErrorNote error={stats.error} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <XPBar profile={profile.data} />
        </div>
        <BotControls />
      </div>

      <PriceTicker />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label={`Fake balance (${cur})`}
          value={total ? money(total.equity, cur) : '—'}
          sub={total ? `Started ${money(total.startingCash, cur)}` : undefined}
        />
        <Stat
          label="Profit / Loss"
          value={total ? money(total.pnl, cur, { sign: true }) : '—'}
          valueClass={tone(total?.pnl ?? 0)}
          sub={total ? pct(total.pnlPct) : undefined}
        />
        <Stat
          label="Costs paid"
          value={total ? money(total.costsPaid, cur) : '—'}
          sub="fees + taxes (spread & slippage are inside fills)"
        />
        <Stat
          label="Wallets"
          value={stats.data?.strategies.filter((s) => s.currency === cur).length ?? '—'}
          sub="one per strategy per market"
        />
      </div>

      <Panel title={`Realized balance over time (${cur})`}>
        <EquityChart
          data={stats.data?.realizedCurve[cur] ?? []}
          currency={cur}
          baseline={total?.startingCash}
          height={280}
        />
        <p className="mt-2 text-xs text-slate-500">
          Starting cash plus closed-trade P/L after all costs; the last point includes open
          positions at market.
        </p>
      </Panel>
    </div>
  );
}

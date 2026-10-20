import { motion } from 'framer-motion';
import { useState } from 'react';
import { Badge, ErrorNote, LiveDot, Toggle } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useLive } from '../hooks/live';
import { api } from '../lib/api';
import { money, price } from '../lib/format';
import type { MarketInfo, Stats } from '../lib/types';

const ICON: Record<string, string> = { crypto: '₿', us: '🇺🇸', india: '🇮🇳', global: '🌐' };

export function MarketsMap() {
  const markets = useApi<MarketInfo[]>('/markets', { pollMs: 30_000 });
  const stats = useApi<Stats>('/stats', { pollMs: 30_000 });
  const { prices } = useLive();
  const [error, setError] = useState<string | null>(null);

  async function toggle(m: MarketInfo, enabled: boolean) {
    setError(null);
    try {
      await api('/settings', { method: 'PUT', body: { markets: { [m.id]: { enabled } } } });
      await markets.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black tracking-wide md:text-3xl">Markets Map</h1>
      <ErrorNote error={markets.error ?? error} />
      <div className="grid gap-4 md:grid-cols-2">
        {(markets.data ?? []).map((m, i) => {
          const balance = (stats.data?.strategies ?? [])
            .filter((s) => s.market === m.id)
            .reduce((a, s) => a + s.equity, 0);
          return (
            <motion.article
              key={m.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`panel ${m.enabled && m.open ? 'border-neon-cyan/40' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl" aria-hidden>
                    {ICON[m.id]}
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold">{m.name}</h2>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <LiveDot on={m.open} label={m.open ? 'Market open' : 'Market closed'} />
                      {m.state && (
                        <Badge tone={m.state.status === 'error' ? 'loss' : 'slate'}>
                          {m.state.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Toggle
                  checked={m.enabled}
                  onChange={(v) => toggle(m, v)}
                  label={`Trade ${m.name}`}
                />
              </div>
              {m.state?.lastError && (
                <p className="mt-2 text-xs text-loss">Last error: {m.state.lastError}</p>
              )}
              <div className="mt-4 flex items-baseline justify-between">
                <span className="label">Balance ({m.currency})</span>
                <span className="num text-xl font-semibold">{money(balance, m.currency)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {m.symbols.map((s) => {
                  const p = prices[`${m.id}:${s}`];
                  return (
                    <span
                      key={s}
                      className="rounded-lg border border-edge bg-void/60 px-2 py-1 text-xs"
                    >
                      <span className="font-semibold">{s}</span>{' '}
                      <span className="num text-slate-400">{p ? price(p.price) : '—'}</span>
                    </span>
                  );
                })}
              </div>
            </motion.article>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        Market hours are checked in each exchange's timezone. Exchange holidays are not modelled
        yet. Yahoo data is delayed.
      </p>
    </div>
  );
}

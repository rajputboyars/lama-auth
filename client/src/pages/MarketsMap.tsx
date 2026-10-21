import { motion } from 'framer-motion';
import { ChartCandlestick } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Term } from '@/components/Term';
import { Badge, ErrorNote, LiveDot, Note, PageHeader, Toggle } from '@/components/common';
import { useApi } from '@/hooks/useApi';
import { useLive } from '@/hooks/live';
import { type TKey, useLang } from '@/i18n';
import { api } from '@/lib/api';
import { money, price } from '@/lib/format';
import type { MarketInfo, Stats } from '@/lib/types';
import { cn } from '@/lib/utils';

const ICON: Record<string, string> = { crypto: '₿', us: '🇺🇸', india: '🇮🇳', global: '🌐' };

export function MarketsMap() {
  const markets = useApi<MarketInfo[]>('/markets', { pollMs: 30_000 });
  const stats = useApi<Stats>('/stats', { pollMs: 30_000 });
  const { prices } = useLive();
  const { t } = useLang();
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
    <div className="space-y-6">
      <PageHeader title={t('markets.title')} intro={t('markets.intro')} />
      <ErrorNote error={markets.error ?? error} />
      <div className="grid gap-4 md:grid-cols-2">
        {(markets.data ?? []).map((m, i) => {
          const balance = (stats.data?.strategies ?? [])
            .filter((s) => s.market === m.id)
            .reduce((a, s) => a + s.equity, 0);
          return (
            <motion.article
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn('panel', m.enabled && m.open && 'ring-1 ring-win/30')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-2xl"
                    aria-hidden
                  >
                    {ICON[m.id]}
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold">{m.name}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <LiveDot
                        on={m.open}
                        label={m.open ? t('markets.open') : t('markets.closed')}
                      />
                      {m.state && (
                        <Badge tone={m.state.status === 'error' ? 'loss' : 'slate'}>
                          {t(`mstatus.${m.state.status}` as TKey)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <label className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                  <Toggle
                    checked={m.enabled}
                    onChange={(v) => toggle(m, v)}
                    label={t('markets.trade', { name: m.name })}
                  />
                  {m.enabled ? t('markets.on') : t('markets.off')}
                </label>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {t(`markets.about.${m.id}` as TKey)}
              </p>
              {m.state?.lastError && (
                <p className="mt-2 text-xs text-loss">
                  {t('markets.lastError')} {m.state.lastError}
                </p>
              )}
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">
                  <Term id="equity">{t('markets.balance', { cur: m.currency })}</Term>
                </span>
                <span className="num text-xl font-bold">{money(balance, m.currency)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {m.symbols.map((s) => {
                  const p = prices[`${m.id}:${s}`];
                  return (
                    <Link
                      key={s}
                      to={`/charts?market=${m.id}&symbol=${encodeURIComponent(s)}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1 text-xs transition hover:border-primary hover:text-primary"
                    >
                      <ChartCandlestick className="h-3.5 w-3.5" />
                      <span className="font-semibold">{s}</span>
                      <span className="num text-muted-foreground">{p ? price(p.price) : '—'}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.article>
          );
        })}
      </div>
      <Note>
        <p>
          {t('markets.footer')} <Term id="delayed-data">{t('markets.delayed')}</Term>
        </p>
      </Note>
    </div>
  );
}

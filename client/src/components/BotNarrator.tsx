import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { MOOD_BY_ID, type Mood, strategyName } from '@/content/strategies';
import { useLive } from '@/hooks/live';
import { type TKey, useLang } from '@/i18n';
import { renderReason } from '@/lib/explain';
import { MARKET_LABEL, timeAgo } from '@/lib/format';
import type { DuelMarket, MarketId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BotControls } from './BotControls';

const ICON: Record<string, string> = { crypto: '₿', us: '🇺🇸', india: '🇮🇳', global: '🌐' };

/** One plain sentence per market saying what the bot is doing right now, updated live. */
export function BotNarrator({ duel }: { duel: DuelMarket[] }) {
  const { t, pick } = useLang();
  const { status, trades } = useLive();
  const running = !!status?.running;

  const lineFor = (
    d: DuelMarket,
  ): { main: string; detail?: string; tone: 'on' | 'off' | 'bad' } => {
    const state = status?.markets[d.market]?.status;
    if (status?.killSwitch) return { main: t('narr.halted'), tone: 'bad' };
    if (!d.enabled || state === 'disabled') return { main: t('narr.disabled'), tone: 'off' };
    if (!d.open || state === 'closed')
      return { main: t('narr.closed'), detail: t(`vs.closed.${d.market}` as TKey), tone: 'off' };
    if (state === 'error') return { main: t('narr.error'), tone: 'bad' };

    const readings = Object.entries(d.moods);
    if (readings.length === 0) return { main: t('narr.warming'), tone: 'on' };
    const symbols = readings.map(([s]) => s).join(', ');
    // The mood most symbols are in, and the strategy Auto-Pilot uses for it.
    const counts = new Map<string, number>();
    for (const [, r] of readings) counts.set(r.mood, (counts.get(r.mood) ?? 0) + 1);
    const [mood] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const chosen = readings.find(([, r]) => r.mood === mood)?.[1].chosen ?? 'none';
    const info = MOOD_BY_ID.get(mood as Mood);
    const moodLabel = info ? pick(info.label).toLowerCase() : mood;
    const main =
      chosen === 'none'
        ? t('narr.out', { symbols, mood: moodLabel })
        : t('narr.using', { symbols, mood: moodLabel, strategy: strategyName(chosen, pick) });

    const newest = readings.sort((a, b) => b[1].time - a[1].time)[0];
    const last = trades.find((x) => x.market === d.market && x.status === 'filled');
    const detail = [
      `${newest[0]}: ${renderReason(newest[1].reason, t, pick)}`,
      last &&
        t('narr.last', {
          action: (last.side === 'buy' ? t('trade.bought') : t('trade.sold')).toLowerCase(),
          symbol: last.symbol,
          ago: timeAgo(last.time),
        }),
    ]
      .filter(Boolean)
      .join(' ');
    return { main, detail, tone: 'on' };
  };

  return (
    <section className="panel">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-card text-primary shadow-soft">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold">{t('narr.title')}</h2>
            <p className="text-sm text-muted-foreground">
              {running ? t('narr.hint') : t('narr.stopped')}
            </p>
          </div>
        </div>
        {!running && <BotControls compact />}
      </header>
      {running && (
        <ul className="space-y-2.5">
          {duel.map((d) => {
            const line = lineFor(d);
            return (
              <li key={d.market} className="neu-inset flex items-start gap-3 rounded-2xl px-4 py-3">
                <span className="mt-0.5 text-xl" aria-hidden>
                  {ICON[d.market as MarketId]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {MARKET_LABEL[d.market]}
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        line.tone === 'on'
                          ? 'bg-win'
                          : line.tone === 'bad'
                            ? 'bg-loss'
                            : 'bg-muted-foreground/40',
                      )}
                    />
                  </div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={line.main + (line.detail ?? '')}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="mt-0.5 text-sm font-semibold leading-snug">{line.main}</p>
                      {line.detail && (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {line.detail}
                        </p>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

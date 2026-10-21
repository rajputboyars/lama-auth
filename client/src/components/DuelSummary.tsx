import { ArrowRight, Bot, Swords, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { strategyName } from '@/content/strategies';
import { useApi } from '@/hooks/useApi';
import { useLive } from '@/hooks/live';
import { useLang } from '@/i18n';
import { duelKey, leader, sideOf } from '@/lib/duel';
import { MARKET_LABEL, pct, tone } from '@/lib/format';
import type { DuelMarket } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Compact You vs Bot scoreboard for the Home page. */
export function DuelSummary() {
  const { t, pick } = useLang();
  const { equities: liveEquities, status } = useLive();
  const equities = status?.running ? liveEquities : {};
  const duel = useApi<DuelMarket[]>('/duel', { pollMs: 30_000 });

  return (
    <section className="panel">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">{t('vs.title')}</h2>
        </div>
        <Link
          to="/vs"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          {t('home.vsOpen')} <ArrowRight className="h-4 w-4" />
        </Link>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(duel.data ?? []).map((d) => {
          const you = sideOf(d.you, d.currency, equities[duelKey(d, 'user')]?.equity);
          const bot = sideOf(d.bot, d.currency, equities[duelKey(d, 'auto')]?.equity);
          const lead = leader(you, bot);
          return (
            <Link
              key={d.market}
              to={`/vs?market=${d.market}`}
              className="rounded-2xl border bg-background p-3 transition hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className="flex items-center justify-between text-sm font-semibold">
                {MARKET_LABEL[d.market]}
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    lead === 'you'
                      ? 'bg-win/10 text-win'
                      : lead === 'bot'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {lead === 'you'
                    ? t('vs.short.you')
                    : lead === 'bot'
                      ? t('vs.short.bot')
                      : t('vs.short.tie')}
                </span>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-muted-foreground">
                    <User className="h-3.5 w-3.5 shrink-0" /> {strategyName(d.userStrategy, pick)}
                  </span>
                  <span className={cn('num font-semibold', tone(you.pnl))}>{pct(you.pnlPct)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Bot className="h-3.5 w-3.5" /> {t('vs.bot')}
                  </span>
                  <span className={cn('num font-semibold', tone(bot.pnl))}>{pct(bot.pnlPct)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

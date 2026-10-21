import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FlaskConical, ThumbsDown, ThumbsUp, TrendingDown, TrendingUp } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PatternArt } from '@/components/PatternArt';
import { Term } from '@/components/Term';
import { UsePickButton } from '@/components/UsePickButton';
import { Note, PageHeader, Panel } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MOODS, MOOD_BY_ID, PICKABLE, STRATEGY_GUIDE, strategyName } from '@/content/strategies';
import { useApi } from '@/hooks/useApi';
import { useLang } from '@/i18n';
import { MARKET_LABEL, pct, tone } from '@/lib/format';
import type { DuelMarket, Stats } from '@/lib/types';

gsap.registerPlugin(ScrollTrigger);

export function StrategyGuide() {
  const { t, pick } = useLang();
  const duel = useApi<DuelMarket[]>('/duel', { pollMs: 30_000 });
  const stats = useApi<Stats>('/stats', { pollMs: 60_000 });
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!root.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el, i) => {
        gsap.from(el, {
          opacity: 0,
          y: 32,
          duration: 0.6,
          delay: (i % 2) * 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  /** Best return each strategy has so far across markets, from the live paper wallets. */
  const scoreOf = (id: string) => {
    const rows = (stats.data?.strategies ?? []).filter((r) => r.strategy === id);
    if (rows.length === 0) return null;
    const trades = rows.reduce((a, r) => a + r.trades, 0);
    const best = rows.reduce((a, r) => (r.totalReturnPct > a.totalReturnPct ? r : a));
    return { trades, best };
  };

  return (
    <div className="space-y-8" ref={root}>
      <PageHeader title={t('guide.title')} intro={t('guide.intro')} />

      <Note tone="warn">
        <p>{t('guide.honest')}</p>
      </Note>

      <Panel title={t('guide.moods')} hint={t('guide.moodsHint')}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {MOODS.map((m) => (
            <div key={m.id} data-reveal className="rounded-2xl border bg-background p-4">
              <div className="text-2xl" aria-hidden>
                {m.icon}
              </div>
              <div className="mt-2 font-display font-bold">{pick(m.label)}</div>
              <p className="mt-1 text-sm text-muted-foreground">{pick(m.meaning)}</p>
              <div className="mt-3 text-xs font-semibold">
                {m.uses ? (
                  <span className="text-primary">
                    {t('guide.botUses')} {strategyName(m.uses, pick)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t('guide.botWaits')}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-2">
          <div className="text-sm font-semibold">{t('guide.moodNow')}</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(duel.data ?? []).map((d) => {
              const readings = Object.entries(d.moods);
              return (
                <div key={d.market} className="rounded-xl border bg-background p-3 text-sm">
                  <div className="font-semibold">{MARKET_LABEL[d.market]}</div>
                  {readings.length === 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {d.open ? t('guide.moodPending') : t('markets.closed')}
                    </p>
                  ) : (
                    <ul className="mt-1 space-y-1">
                      {readings.map(([sym, r]) => {
                        const info = MOOD_BY_ID.get(r.mood);
                        return (
                          <li key={sym} className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium">{sym}</span>
                            <span className="text-muted-foreground">
                              {info?.icon} {info ? pick(info.label) : r.mood}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        {STRATEGY_GUIDE.map((s) => {
          const score = scoreOf(s.id);
          return (
            <article key={s.id} data-reveal className="panel flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold">
                    <span aria-hidden>{s.icon}</span> {pick(s.name)}
                  </h2>
                  <p className="mt-1 text-muted-foreground">{pick(s.oneLiner)}</p>
                </div>
                {s.id === 'auto' && (
                  <Badge variant="info" className="shrink-0 whitespace-nowrap">
                    {t('guide.theBot')}
                  </Badge>
                )}
              </div>
              <PatternArt pattern={s.pattern} />
              <p className="text-sm italic text-muted-foreground">“{pick(s.analogy)}”</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <Rule icon={<TrendingUp className="h-4 w-4 text-win" />} title={t('guide.buyWhen')}>
                  {pick(s.buyRule)}
                </Rule>
                <Rule
                  icon={<TrendingDown className="h-4 w-4 text-loss" />}
                  title={t('guide.sellWhen')}
                >
                  {pick(s.sellRule)}
                </Rule>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Rule icon={<ThumbsUp className="h-4 w-4 text-win" />} title={t('guide.likes')}>
                  {s.bestMood.length === 0
                    ? t('guide.anyMood')
                    : s.bestMood.map((m) => {
                        const info = MOOD_BY_ID.get(m)!;
                        return (
                          <span key={m} className="mr-2 inline-block">
                            {info.icon} {pick(info.label)}
                          </span>
                        );
                      })}
                </Rule>
                <Rule
                  icon={<ThumbsDown className="h-4 w-4 text-loss" />}
                  title={t('guide.struggles')}
                >
                  {pick(s.worstWhen)}
                </Rule>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                <span className="text-muted-foreground">{t('guide.learnTerms')}</span>
                {s.terms.map((id) => (
                  <Badge key={id} variant="outline">
                    <Term id={id} />
                  </Badge>
                ))}
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  {score ? (
                    <>
                      {t('guide.scoreSoFar', { trades: score.trades })}{' '}
                      <span className={`num font-semibold ${tone(score.best.totalReturnPct)}`}>
                        {pct(score.best.totalReturnPct)}
                      </span>{' '}
                      ({MARKET_LABEL[score.best.market]})
                    </>
                  ) : (
                    t('guide.noScore')
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.id !== 'arbitrage' && (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/lab?strategy=${s.id}`}>
                        <FlaskConical /> {t('guide.test')}
                      </Link>
                    </Button>
                  )}
                  {PICKABLE.includes(s.id) && <UsePickButton strategy={s.id} />}
                  {s.id === 'auto' && (
                    <Button asChild size="sm">
                      <Link to="/vs">{t('guide.challenge')}</Link>
                    </Button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Rule({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
        {icon} {title}
      </div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

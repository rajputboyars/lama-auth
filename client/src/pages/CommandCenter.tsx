import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BotControls } from '@/components/BotControls';
import { BotNarrator } from '@/components/BotNarrator';
import { DuelSummary } from '@/components/DuelSummary';
import { EquityChart } from '@/components/EquityChart';
import { Term } from '@/components/Term';
import {
  HeroBalance,
  LearningRing,
  LevelGauge,
  type MarketBar,
  MarketBars,
  MoodDonut,
  QuestList,
  RecentTrades,
  type TrendItem,
  TrendingPills,
} from '@/components/dashboard';
import { ErrorNote, PageHeader, PaperBanner, Panel, Stat } from '@/components/common';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GLOSSARY } from '@/content/glossary';
import type { Mood } from '@/content/strategies';
import { useLearned } from '@/hooks/learned';
import { useMode } from '@/hooks/mode';
import { useApi } from '@/hooks/useApi';
import { useLive } from '@/hooks/live';
import { useLang } from '@/i18n';
import { money } from '@/lib/format';
import type { Achievement, Currency, DuelMarket, Profile, Quest, Stats, Trade } from '@/lib/types';

export function CommandCenter() {
  const { walletTick, trades: liveTrades, prices } = useLive();
  const { t } = useLang();
  const { simple } = useMode();
  const stats = useApi<Stats>('/stats', { pollMs: 30_000, deps: [liveTrades.length] });
  const profile = useApi<Profile>('/game/profile', { pollMs: 60_000 });
  const quests = useApi<Quest[]>('/game/quests', { pollMs: 60_000 });
  const badges = useApi<Achievement[]>('/game/achievements', { pollMs: 120_000 });
  const duel = useApi<DuelMarket[]>('/duel', { pollMs: 30_000 });
  const history = useApi<{ items: Trade[] }>('/trades?status=filled&pageSize=6', {
    deps: [liveTrades.length],
  });
  const { learned } = useLearned();
  const currencies = Object.keys(stats.data?.totals ?? {}) as Currency[];
  const [cur, setCur] = useState<Currency>('USD');

  // Refresh balances at most every 5s when wallets tick.
  useEffect(() => {
    const timer = setTimeout(() => void stats.reload(), 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletTick]);

  useEffect(() => {
    if (currencies.length && !currencies.includes(cur)) setCur(currencies[0]);
  }, [currencies, cur]);

  const total = stats.data?.totals[cur];
  const daily = (quests.data ?? []).filter((q) => q.cadence === 'daily');
  const questsPct = daily.length
    ? (daily.filter((q) => q.completedAt).length / daily.length) * 100
    : 0;
  const badgeList = badges.data ?? [];
  const badgesPct = badgeList.length
    ? (badgeList.filter((b) => b.unlockedAt).length / badgeList.length) * 100
    : 0;
  const streak = Number(profile.data?.counters?.riskCleanStreak ?? 0);
  const learnedCount = learned.filter((id) => GLOSSARY.some((g) => g.id === id)).length;

  const marketBars = useMemo<MarketBar[]>(() => {
    const by = new Map<string, MarketBar>();
    for (const r of stats.data?.strategies ?? []) {
      const b = by.get(r.market) ?? {
        market: r.market,
        equity: 0,
        startingCash: 0,
        currency: r.currency,
      };
      b.equity += r.equity;
      b.startingCash += r.startingCash;
      by.set(r.market, b);
    }
    return [...by.values()];
  }, [stats.data]);

  const moodCounts = useMemo(() => {
    const c: Partial<Record<Mood, number>> = {};
    for (const d of duel.data ?? [])
      for (const r of Object.values(d.moods)) c[r.mood] = (c[r.mood] ?? 0) + 1;
    return c;
  }, [duel.data]);

  const trending = useMemo<TrendItem[]>(
    () =>
      Object.entries(prices)
        .map(([key, p]) => ({
          key,
          market: p.market,
          symbol: p.symbol,
          changePct: p.first ? ((p.price - p.first) / p.first) * 100 : 0,
        }))
        .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
        .slice(0, 6),
    [prices],
  );

  const recent = useMemo(() => {
    const seen = new Set<string>();
    return [...liveTrades.filter((x) => x.status === 'filled'), ...(history.data?.items ?? [])]
      .filter((x) => {
        const k = x.id ?? `${x.time}:${x.symbol}:${x.strategy}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 5);
  }, [liveTrades, history.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('home.title')}
        intro={t('home.intro')}
        action={
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 rounded-full bg-card px-4 py-2 shadow-soft"
            title={t('dash.streakHint')}
          >
            <Flame className="h-5 w-5 text-warn" />
            <span className="font-display font-bold">{t('game.streak', { n: streak })}</span>
          </motion.div>
        }
      />
      <PaperBanner />
      <BotNarrator duel={duel.data ?? []} />
      <ErrorNote error={stats.error} />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-6">
          <HeroBalance
            equity={total?.equity ?? 0}
            pnl={total?.pnl ?? 0}
            pnlPct={total?.pnlPct ?? 0}
            currency={cur}
            curve={stats.data?.realizedCurve[cur] ?? []}
          />
          <BotControls />
        </div>
        <div className="lg:col-span-6">
          <LevelGauge
            level={profile.data?.level ?? 1}
            progressPct={profile.data?.progressPct ?? 0}
            questsPct={questsPct}
            badgesPct={badgesPct}
            action={
              currencies.length > 1 && (
                <Tabs value={cur} onValueChange={(v) => setCur(v as Currency)}>
                  <TabsList aria-label={t('home.currency')}>
                    {currencies.map((c) => (
                      <TabsTrigger key={c} value={c}>
                        {c}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )
            }
          >
            <MarketBars rows={marketBars} />
          </LevelGauge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <MoodDonut counts={moodCounts} />
        </div>
        <div className="space-y-6 lg:col-span-7">
          <TrendingPills items={trending} />
          <RecentTrades trades={recent} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <QuestList quests={quests.data ?? []} />
        </div>
        <div className="lg:col-span-5">
          <LearningRing learned={learnedCount} total={GLOSSARY.length} />
        </div>
      </div>

      <DuelSummary />

      {!simple && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat
            label={<Term id="fees">{t('home.costs')}</Term>}
            value={total ? money(total.costsPaid, cur) : '—'}
            sub={t('home.costsHint')}
          />
          <Stat
            label={<Term id="wallet">{t('home.wallets')}</Term>}
            value={stats.data?.strategies.filter((s) => s.currency === cur).length ?? '—'}
            sub={t('home.walletsHint')}
          />
          <Stat
            label={t('dash.started')}
            value={total ? money(total.startingCash, cur) : '—'}
            sub={t('dash.startedHint')}
          />
          <Stat
            label={<Term id="xp">XP</Term>}
            value={profile.data?.xp ?? '—'}
            sub={t('xp.hint')}
          />
        </div>
      )}

      <Panel title={t('home.curve', { cur })} hint={t('home.curveHint')}>
        <EquityChart
          data={stats.data?.realizedCurve[cur] ?? []}
          currency={cur}
          baseline={total?.startingCash}
          height={280}
        />
      </Panel>
    </div>
  );
}

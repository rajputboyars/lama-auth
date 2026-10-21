import { ArrowRight, BookOpen, ChartCandlestick, Swords } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BotControls } from '@/components/BotControls';
import { DuelSummary } from '@/components/DuelSummary';
import { EquityChart } from '@/components/EquityChart';
import { PriceTicker } from '@/components/PriceTicker';
import { Term } from '@/components/Term';
import { XPBar } from '@/components/XPBar';
import { ErrorNote, PageHeader, PaperBanner, Panel, Stat } from '@/components/common';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApi } from '@/hooks/useApi';
import { useLive } from '@/hooks/live';
import { useLang } from '@/i18n';
import { money, pct, tone } from '@/lib/format';
import type { Currency, Profile, Stats } from '@/lib/types';

export function CommandCenter() {
  const { walletTick, trades } = useLive();
  const { t } = useLang();
  const stats = useApi<Stats>('/stats', { pollMs: 30_000, deps: [trades.length] });
  const profile = useApi<Profile>('/game/profile', { pollMs: 60_000 });
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
  const quickLinks = [
    {
      to: '/charts',
      icon: ChartCandlestick,
      title: t('home.go.charts'),
      body: t('home.go.chartsBody'),
    },
    { to: '/vs', icon: Swords, title: t('home.go.vs'), body: t('home.go.vsBody') },
    { to: '/learn/terms', icon: BookOpen, title: t('home.go.learn'), body: t('home.go.learnBody') },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('home.title')}
        intro={t('home.intro')}
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
      />
      <PaperBanner />
      <ErrorNote error={stats.error} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <XPBar profile={profile.data} />
          <div className="grid gap-3 sm:grid-cols-3">
            {quickLinks.map((q) => (
              <Link
                key={q.to}
                to={q.to}
                className="group panel flex flex-col gap-2 transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <q.icon className="h-5 w-5 text-primary" />
                <span className="font-display font-bold">{q.title}</span>
                <span className="text-sm text-muted-foreground">{q.body}</span>
                <ArrowRight className="mt-auto h-4 w-4 text-primary transition group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
        <BotControls />
      </div>

      <PriceTicker />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label={<Term id="equity">{t('home.balance', { cur })}</Term>}
          value={total ? money(total.equity, cur) : '—'}
          sub={total ? t('home.started', { amount: money(total.startingCash, cur) }) : undefined}
        />
        <Stat
          label={<Term id="pnl">{t('home.pnl')}</Term>}
          value={total ? money(total.pnl, cur, { sign: true }) : '—'}
          valueClass={tone(total?.pnl ?? 0)}
          sub={total ? pct(total.pnlPct) : undefined}
        />
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
      </div>

      <DuelSummary />

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

import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Crown, RotateCcw, Scale, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AnimatedMoney } from '@/components/AnimatedMoney';
import { BotControls } from '@/components/BotControls';
import { Term } from '@/components/Term';
import { TradeCard } from '@/components/TradeCard';
import { Empty, ErrorNote, Note, PageHeader, Panel } from '@/components/common';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GUIDE_BY_ID, MOOD_BY_ID, PICKABLE, strategyName } from '@/content/strategies';
import { useChartColors } from '@/hooks/theme';
import { useApi } from '@/hooks/useApi';
import { useLive } from '@/hooks/live';
import { type TKey, useLang } from '@/i18n';
import { api } from '@/lib/api';
import { type DuelPoint, type Side, duelKey, leader, mergeHistory, sideOf } from '@/lib/duel';
import { MARKET_LABEL, money, pct, tone } from '@/lib/format';
import type { DuelMarket, Trade } from '@/lib/types';
import { cn } from '@/lib/utils';

export function YouVsBot() {
  const { t } = useLang();
  const live = useLive();
  const [params, setParams] = useSearchParams();
  const duel = useApi<DuelMarket[]>('/duel', { pollMs: 20_000, deps: [live.trades.length] });
  const market = params.get('market') ?? 'crypto';
  const d = duel.data?.find((x) => x.market === market) ?? duel.data?.[0];

  return (
    <div className="space-y-6">
      <PageHeader title={t('vs.title')} intro={t('vs.intro')} action={<BotControls compact />} />
      <ErrorNote error={duel.error} />

      <Tabs
        value={d?.market ?? market}
        onValueChange={(v) => setParams({ market: v }, { replace: true })}
      >
        <TabsList>
          {(duel.data ?? []).map((x) => (
            <TabsTrigger key={x.market} value={x.market}>
              {MARKET_LABEL[x.market]}
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  x.open ? 'bg-win' : 'bg-muted-foreground/40',
                )}
              />
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {d ? (
        <Match key={d.market} d={d} onChanged={() => void duel.reload()} />
      ) : (
        <Empty>{t('common.loading')}</Empty>
      )}
    </div>
  );
}

function Match({ d, onChanged }: { d: DuelMarket; onChanged(): void }) {
  const { t, pick } = useLang();
  const live = useLive();
  const colors = useChartColors();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const running = !!live.status?.running;

  // Live wallet ticks only arrive while the bot runs; once stopped, trust the server's numbers.
  const youLive = running ? live.equities[duelKey(d, 'user')] : undefined;
  const botLive = running ? live.equities[duelKey(d, 'auto')] : undefined;
  const you = sideOf(d.you, d.currency, youLive?.equity);
  const bot = sideOf(d.bot, d.currency, botLive?.equity);
  const lead = leader(you, bot);
  const gap = Math.abs(you.pnl - bot.pnl);

  // Chart points: server history plus live wallet ticks that arrived since the last poll.
  const [extra, setExtra] = useState<DuelPoint[]>([]);
  useEffect(() => setExtra([]), [d.history]);
  useEffect(() => {
    if (youLive || botLive)
      setExtra((xs) => [
        ...xs.slice(-200),
        { time: Date.now(), you: youLive?.equity, bot: botLive?.equity },
      ]);
  }, [youLive, botLive]);
  const points = useMemo(
    () => [...mergeHistory(d.history.you, d.history.bot), ...extra],
    [d.history, extra],
  );

  const trades = useApi<{ items: Trade[] }>(`/trades?market=${d.market}&pageSize=40`, {
    deps: [live.trades.length],
  });
  const duelTrades = useMemo(() => {
    const seen = new Set<string>();
    return [...live.trades, ...(trades.data?.items ?? [])]
      .filter((x) => x.market === d.market && (x.strategy === 'user' || x.strategy === 'auto'))
      .filter((x) => {
        const k = x.id ?? `${x.time}:${x.symbol}:${x.strategy}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 8);
  }, [live.trades, trades.data, d.market]);

  async function setPick(id: string) {
    setError(null);
    try {
      await api(`/duel/${d.market}`, { method: 'PUT', body: { userStrategy: id } });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function reset() {
    if (!confirm(t('vs.reset.confirm', { market: MARKET_LABEL[d.market] }))) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/duel/${d.market}/reset`, { method: 'POST' });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const moods = Object.entries(d.moods);
  const fmt = (v: number) => money(v, d.currency, { compact: true });

  return (
    <div className="space-y-5">
      {!d.open && (
        <Note>
          <p>
            <strong>{t('vs.closedTitle', { market: MARKET_LABEL[d.market] })}</strong>{' '}
            {t(`vs.closed.${d.market}` as TKey)}
          </p>
        </Note>
      )}
      {!d.enabled && (
        <Note tone="warn">
          <p>{t('vs.disabled')}</p>
        </Note>
      )}
      {!running && d.open && (
        <Note>
          <p>{t('vs.startHint')}</p>
        </Note>
      )}
      <ErrorNote error={error} />

      <motion.div
        layout
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 md:p-5',
          lead === 'you' && 'border-win/40 bg-win/10',
          lead === 'bot' && 'border-primary/40 bg-primary/10',
          lead === 'tie' && 'bg-muted/60',
        )}
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-card shadow-soft">
            {lead === 'tie' ? (
              <Scale className="h-5 w-5" />
            ) : (
              <Crown className="h-5 w-5 text-warn" />
            )}
          </span>
          <div>
            <div className="font-display text-xl font-extrabold">
              {lead === 'you'
                ? t('vs.lead.you')
                : lead === 'bot'
                  ? t('vs.lead.bot')
                  : t('vs.lead.tie')}
            </div>
            <div className="text-sm text-muted-foreground">
              {lead === 'tie'
                ? t('vs.lead.tieHint')
                : t('vs.lead.by', {
                    amount: money(gap, d.currency),
                    pct: Math.abs(you.pnlPct - bot.pnlPct).toFixed(2),
                  })}
            </div>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="outline" size="sm" onClick={reset} disabled={running || busy}>
                <RotateCcw /> {t('vs.reset')}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{running ? t('vs.reset.stopFirst') : t('vs.reset.hint')}</TooltipContent>
        </Tooltip>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <SideCard
          who="you"
          side={you}
          currency={d.currency}
          leading={lead === 'you'}
          header={
            <div className="space-y-1.5">
              <div className="text-sm font-medium">{t('vs.yourStrategy')}</div>
              <Select value={d.userStrategy} onValueChange={setPick}>
                <SelectTrigger className="h-auto min-h-10 py-2 text-left">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PICKABLE.map((id) => {
                    const g = GUIDE_BY_ID.get(id)!;
                    return (
                      <SelectItem key={id} value={id} description={pick(g.oneLiner)}>
                        {g.icon} {pick(g.name)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('vs.pickHint')}</p>
            </div>
          }
        />
        <SideCard
          who="bot"
          side={bot}
          currency={d.currency}
          leading={lead === 'bot'}
          header={
            <div className="space-y-1.5">
              <div className="text-sm font-medium">
                <Term id="auto-pilot">{t('vs.botStrategy')}</Term>
              </div>
              {moods.length === 0 ? (
                <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                  {t('vs.botWaiting')}
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {moods.map(([sym, r]) => {
                    const info = MOOD_BY_ID.get(r.mood);
                    return (
                      <li
                        key={sym}
                        className="rounded-xl bg-muted/60 px-3 py-2 text-sm"
                        title={r.reason}
                      >
                        <span className="font-semibold">{sym}</span>{' '}
                        <span className="text-muted-foreground">
                          {info?.icon} {t('vs.moodIs')}{' '}
                          <Term id="market-mood">{info ? pick(info.label) : r.mood}</Term>
                          {' → '}
                          {r.chosen === 'none' ? (
                            t('vs.botStaysOut')
                          ) : (
                            <span className="font-semibold text-foreground">
                              {t('vs.botUses', { name: strategyName(r.chosen, pick) })}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          }
        />
      </div>

      <Panel title={t('vs.chart')} hint={t('vs.chartHint')}>
        {points.length < 2 ? (
          <div className="grid h-64 place-items-center rounded-xl border border-dashed text-sm text-muted-foreground">
            {t('vs.chartEmpty')}
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(v: number) =>
                    new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                  stroke={colors.muted}
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tickFormatter={fmt}
                  stroke={colors.muted}
                  fontSize={11}
                  width={64}
                  tickLine={false}
                />
                <ChartTooltip
                  contentStyle={{
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    fontSize: 12,
                    color: colors.text,
                  }}
                  labelFormatter={(v) => new Date(Number(v)).toLocaleString()}
                  formatter={(v, name) => [
                    money(Number(v), d.currency),
                    name === 'you' ? t('vs.you') : t('vs.bot'),
                  ]}
                />
                <Legend formatter={(v) => (v === 'you' ? t('vs.you') : t('vs.bot'))} />
                <Line
                  type="monotone"
                  dataKey="you"
                  stroke={colors.win}
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="bot"
                  stroke={colors.primary}
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Panel title={t('vs.recent')}>
        {duelTrades.length === 0 ? (
          <Empty>{t('vs.noTrades')}</Empty>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            <AnimatePresence initial={false}>
              {duelTrades.map((x) => (
                <TradeCard key={x.id ?? `${x.time}:${x.symbol}:${x.strategy}`} trade={x} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </Panel>
    </div>
  );
}

function SideCard({
  who,
  side,
  currency,
  leading,
  header,
}: {
  who: 'you' | 'bot';
  side: Side;
  currency: DuelMarket['currency'];
  leading: boolean;
  header: React.ReactNode;
}) {
  const { t } = useLang();
  const Icon = who === 'you' ? User : Bot;
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'panel space-y-4',
        leading && (who === 'you' ? 'ring-2 ring-win/40' : 'ring-2 ring-primary/40'),
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'grid h-10 w-10 place-items-center rounded-xl',
              who === 'you' ? 'bg-win/10 text-win' : 'bg-primary/10 text-primary',
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-extrabold">
            {who === 'you' ? t('vs.you') : t('vs.bot')}
          </span>
        </div>
        {leading && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-semibold text-warn">
            <Crown className="h-3.5 w-3.5" /> {t('vs.leading')}
          </span>
        )}
      </div>
      {header}
      <div>
        <div className="text-sm text-muted-foreground">
          <Term id="pnl">{t('vs.pnl')}</Term>
        </div>
        <div className={cn('num text-4xl font-extrabold tracking-tight', tone(side.pnl))}>
          <AnimatedMoney value={side.pnl} currency={currency} sign />
        </div>
        <div className={cn('num text-sm', tone(side.pnl))}>{pct(side.pnlPct)}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Mini
          k={<Term id="equity">{t('vs.balance')}</Term>}
          v={<AnimatedMoney value={side.equity} currency={currency} />}
        />
        <Mini k={t('vs.trades')} v={side.trades} />
        <Mini k={<Term id="win-rate">{t('vs.winRate')}</Term>} v={pct(side.winRatePct, 0, false)} />
        <Mini k={<Term id="position">{t('vs.open')}</Term>} v={side.openPositions} />
      </div>
    </motion.section>
  );
}

function Mini({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-muted/60 px-3 py-2">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="num font-semibold">{v}</div>
    </div>
  );
}

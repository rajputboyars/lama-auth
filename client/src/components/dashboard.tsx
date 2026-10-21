import { motion } from 'framer-motion';
import { ArrowUpRight, CircleCheck, Circle, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MOOD_BY_ID, type Mood, strategyName } from '@/content/strategies';
import { useLang } from '@/i18n';
import { MARKET_LABEL, money, pct, timeAgo, tone } from '@/lib/format';
import type { Currency, EquityPoint, Quest, Trade } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AnimatedMoney } from './AnimatedMoney';
import { Term } from './Term';

/* ---------------------------------------------------------------- Hero balance */

export function HeroBalance({
  equity,
  pnl,
  pnlPct,
  currency,
  curve,
}: {
  equity: number;
  pnl: number;
  pnlPct: number;
  currency: Currency;
  curve: EquityPoint[];
}) {
  const { t } = useLang();
  // Last few balance points as bars, scaled to their own range so small moves still show.
  const pts = curve.slice(-6).map((p) => p.equity);
  const lo = Math.min(...pts, equity);
  const hi = Math.max(...pts, equity);
  const bars = (pts.length ? pts : [equity]).map(
    (v) => 0.25 + (hi === lo ? 0.5 : ((v - lo) / (hi - lo)) * 0.75),
  );
  return (
    <motion.section
      initial={{ opacity: 0, y: 16, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="hero-gradient relative flex min-h-[15rem] flex-col justify-between overflow-hidden rounded-[2rem] p-6 text-[hsl(236_45%_18%)] shadow-lift dark:text-white md:p-7"
    >
      <span className="absolute right-5 top-5 grid h-14 w-14 place-items-center rounded-full bg-white/70 shadow-soft backdrop-blur dark:bg-white/15">
        <Wallet className="h-6 w-6" />
      </span>
      <div>
        <div className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          <AnimatedMoney value={equity} currency={currency} />
        </div>
        <div
          className={cn(
            'mt-2 inline-flex items-center gap-1 rounded-full bg-white/60 px-3 py-1 text-sm font-bold dark:bg-white/15',
            pnl >= 0
              ? 'text-[hsl(158_72%_26%)] dark:text-[hsl(155_70%_70%)]'
              : 'text-[hsl(6_76%_42%)] dark:text-[hsl(6_90%_78%)]',
          )}
        >
          {money(pnl, currency, { sign: true })} · {pct(pnlPct)}
        </div>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="max-w-[10rem] font-display text-xl font-semibold leading-tight md:text-2xl">
          <Term id="equity" className="decoration-current/40">
            {t('dash.hero.label')}
          </Term>
        </div>
        <div className="flex h-20 items-end gap-2" aria-hidden>
          {bars.map((h, i) => (
            <motion.span
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h * 100}%` }}
              transition={{ delay: 0.3 + i * 0.07, type: 'spring', stiffness: 160, damping: 18 }}
              className={cn(
                'w-5 rounded-lg',
                i === bars.length - 1 ? 'bg-[hsl(248_70%_55%)]' : 'bg-[hsl(262_80%_70%/0.75)]',
              )}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

/* ---------------------------------------------------------------- Level gauge */

const ARC = Math.PI * 90;

/** Half-circle gauge: outer arc is XP to next level, inner arc is today's quests. */
export function LevelGauge({
  level,
  progressPct,
  questsPct,
  badgesPct,
  children,
  action,
}: {
  level: number;
  progressPct: number;
  questsPct: number;
  badgesPct: number;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const { t } = useLang();
  const p = Math.max(0, Math.min(100, progressPct)) / 100;
  const q = Math.max(0, Math.min(100, questsPct)) / 100;
  const ticks = Array.from({ length: 41 }, (_, i) => i / 40);
  return (
    <section className="panel flex flex-col">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">
            <Term id="xp">{t('dash.gauge.title')}</Term>
          </h2>
          <p className="text-sm text-muted-foreground">{t('dash.gauge.hint')}</p>
        </div>
        {action}
      </header>
      <div className="relative mx-auto mt-2 w-full max-w-sm">
        <svg viewBox="0 0 240 140" className="w-full overflow-visible">
          {ticks.map((f) => {
            const a = Math.PI * (1 - f);
            const major = Math.round(f * 40) % 10 === 0;
            const r1 = major ? 106 : 108;
            return (
              <line
                key={f}
                x1={120 + Math.cos(a) * r1}
                y1={125 - Math.sin(a) * r1}
                x2={120 + Math.cos(a) * 112}
                y2={125 - Math.sin(a) * 112}
                className={major ? 'stroke-muted-foreground' : 'stroke-muted-foreground/40'}
                strokeWidth={major ? 1.5 : 1}
                strokeLinecap="round"
              />
            );
          })}
          {[0, 25, 50, 75, 100].map((v) => {
            const a = Math.PI * (1 - v / 100);
            return (
              <text
                key={v}
                x={120 + Math.cos(a) * 124}
                y={128 - Math.sin(a) * 124}
                textAnchor="middle"
                fontSize="9"
                className="fill-muted-foreground"
              >
                {v}
              </text>
            );
          })}
          <path
            d="M30,125 A90,90 0 0 1 210,125"
            className="fill-none stroke-primary/15"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <motion.path
            d="M30,125 A90,90 0 0 1 210,125"
            className="fill-none stroke-primary"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={ARC}
            initial={{ strokeDashoffset: ARC }}
            animate={{ strokeDashoffset: ARC * (1 - p) }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
          <path
            d="M50,125 A70,70 0 0 1 190,125"
            className="fill-none stroke-c-coral/15"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <motion.path
            d="M50,125 A70,70 0 0 1 190,125"
            className="fill-none stroke-c-coral"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={Math.PI * 70}
            initial={{ strokeDashoffset: Math.PI * 70 }}
            animate={{ strokeDashoffset: Math.PI * 70 * (1 - q) }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-6 pb-1">
          <GaugeStat
            value={`${Math.round(p * 100)}%`}
            label={t('dash.gauge.toNext', { n: level + 1 })}
            dot="bg-primary"
          />
          <GaugeStat
            value={`${Math.round(q * 100)}%`}
            label={t('dash.gauge.quests')}
            dot="bg-c-coral"
          />
          <GaugeStat
            value={`${Math.round(badgesPct)}%`}
            label={t('dash.gauge.badges')}
            dot="bg-muted-foreground/50"
          />
        </div>
      </div>
      {children}
    </section>
  );
}

function GaugeStat({ value, label, dot }: { value: string; label: string; dot: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">{value}</div>
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <span className={cn('h-2 w-2 rounded-full', dot)} /> {label}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Market pill bars */

export interface MarketBar {
  market: string;
  equity: number;
  startingCash: number;
  currency: Currency;
}

const BAR_COLORS = ['bg-c-navy', 'bg-c-indigo', 'bg-c-violet', 'bg-c-coral'];

/** One pill per market. The fill shows that market's return; ±10% fills it end to end. */
export function MarketBars({ rows }: { rows: MarketBar[] }) {
  const { t } = useLang();
  return (
    <div className="mt-5 space-y-2.5">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('dash.bars.title')}
      </div>
      {rows.map((r, i) => {
        const ret = r.startingCash ? ((r.equity - r.startingCash) / r.startingCash) * 100 : 0;
        const fill = Math.max(18, Math.min(100, 50 + ret * 5));
        return (
          <div key={r.market} className="neu-inset relative h-9 overflow-hidden rounded-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${fill}%` }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'flex h-full items-center justify-between rounded-full px-4 text-xs font-semibold text-white',
                BAR_COLORS[i % 4],
              )}
            >
              <span className="truncate">{MARKET_LABEL[r.market] ?? r.market}</span>
              <span className="num opacity-90">{pct(ret)}</span>
            </motion.div>
            <span className="num absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold">
              {money(r.equity, r.currency, { compact: true })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- Market mood donut */

const MOOD_COLOR: Record<Mood, string> = {
  uptrend: 'stroke-c-green',
  sideways: 'stroke-c-teal',
  squeeze: 'stroke-c-violet',
  downtrend: 'stroke-c-coral',
  unclear: 'stroke-muted-foreground/40',
};
const MOOD_PILL: Record<Mood, string> = {
  uptrend: 'bg-c-green',
  sideways: 'bg-c-teal',
  squeeze: 'bg-c-violet',
  downtrend: 'bg-c-coral',
  unclear: 'bg-muted-foreground/60',
};

/** Share of watched symbols in each market mood, like a fear and greed meter. */
export function MoodDonut({ counts }: { counts: Partial<Record<Mood, number>> }) {
  const { t, pick } = useLang();
  const total = Object.values(counts).reduce((a, n) => a + (n ?? 0), 0);
  const tradable = (counts.uptrend ?? 0) + (counts.sideways ?? 0) + (counts.squeeze ?? 0);
  const score = total ? Math.round((tradable / total) * 100) : 0;
  const R = 72;
  const C = 2 * Math.PI * R;
  const order: Mood[] = ['downtrend', 'uptrend', 'squeeze', 'sideways', 'unclear'];
  let acc = 0;
  const segs = order
    .filter((m) => (counts[m] ?? 0) > 0)
    .map((m) => {
      const frac = (counts[m] ?? 0) / total;
      const seg = { m, frac, start: acc };
      acc += frac;
      return seg;
    });

  return (
    <section className="panel">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold">
            <Term id="market-mood">{t('dash.mood.title')}</Term>
          </h2>
          <p className="text-sm text-muted-foreground">{t('dash.mood.hint')}</p>
        </div>
        <Link
          to="/learn/strategies"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card shadow-soft transition hover:text-primary active:shadow-neu-inset"
          aria-label={t('nav.strategies')}
        >
          <ArrowUpRight className="h-5 w-5" />
        </Link>
      </header>
      {total === 0 ? (
        <div className="neu-inset mt-5 grid h-60 place-items-center rounded-3xl px-6 text-center text-sm text-muted-foreground">
          {t('dash.mood.empty')}
        </div>
      ) : (
        <div className="relative mx-auto mt-2 aspect-square w-full max-w-[17rem]">
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
            <circle
              cx="100"
              cy="100"
              r={R}
              strokeWidth="24"
              className="fill-none stroke-background"
            />
            {segs.map((s, i) => (
              <motion.circle
                key={s.m}
                cx="100"
                cy="100"
                r={R}
                strokeWidth={s.m === 'downtrend' || i === 0 ? 30 : 24}
                className={cn('fill-none', MOOD_COLOR[s.m])}
                strokeDasharray={`${Math.max(0, s.frac * C - 3)} ${C}`}
                initial={{ strokeDashoffset: C * 0.25 }}
                animate={{ strokeDashoffset: -s.start * C }}
                transition={{ duration: 0.9, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="font-display text-5xl font-extrabold tracking-tight">{score}%</div>
              <div className="mx-auto max-w-[8rem] text-xs text-muted-foreground">
                {t('dash.mood.center')}
              </div>
            </div>
          </div>
          {segs.map((s) => {
            const a = (s.start + s.frac / 2) * 2 * Math.PI - Math.PI / 2;
            return (
              <span
                key={s.m}
                className={cn(
                  'absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow-soft',
                  MOOD_PILL[s.m],
                )}
                style={{ left: `${50 + Math.cos(a) * 46}%`, top: `${50 + Math.sin(a) * 46}%` }}
              >
                {Math.round(s.frac * 100)}%
              </span>
            );
          })}
        </div>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs">
        {(Object.keys(MOOD_PILL) as Mood[]).map((m) => {
          const info = MOOD_BY_ID.get(m)!;
          return (
            <span key={m} className="flex items-center gap-1.5 text-muted-foreground">
              <span className={cn('h-2.5 w-2.5 rounded-full', MOOD_PILL[m])} /> {pick(info.label)}{' '}
              <span className="num font-semibold text-foreground">{counts[m] ?? 0}</span>
            </span>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Recent trades */

const AVATAR = ['bg-c-navy', 'bg-c-indigo', 'bg-c-violet', 'bg-c-coral', 'bg-c-teal', 'bg-c-green'];
const avatarColor = (s: string) =>
  AVATAR[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];

export function RecentTrades({ trades }: { trades: Trade[] }) {
  const { t, pick } = useLang();
  return (
    <section className="panel">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">{t('dash.recent.title')}</h2>
        <Link
          to="/feed"
          className="grid h-11 w-11 place-items-center rounded-full bg-card shadow-soft transition hover:text-primary active:shadow-neu-inset"
          aria-label={t('nav.feed')}
        >
          <ArrowUpRight className="h-5 w-5" />
        </Link>
      </header>
      {trades.length === 0 ? (
        <p className="neu-inset rounded-3xl px-4 py-8 text-center text-sm text-muted-foreground">
          {t('dash.recent.empty')}
        </p>
      ) : (
        <ul className="divide-y divide-border/70">
          {trades.map((x) => {
            const closing = x.side !== 'buy';
            return (
              <li
                key={x.id ?? `${x.time}:${x.symbol}:${x.strategy}`}
                className="flex items-center gap-3 py-3"
              >
                <span
                  className={cn(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white shadow-neu-sm',
                    avatarColor(x.symbol),
                  )}
                >
                  {x.symbol.replace(/[^A-Z]/g, '').slice(0, 3) || x.symbol.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">
                    {x.side === 'buy'
                      ? t('trade.bought')
                      : x.side === 'arb'
                        ? t('trade.arb')
                        : t('trade.sold')}{' '}
                    {x.symbol}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {strategyName(x.strategy, pick)} · {timeAgo(x.time)}
                  </div>
                </div>
                <div
                  className={cn(
                    'num text-right text-sm font-semibold',
                    closing ? tone(x.pnl) : 'text-muted-foreground',
                  )}
                >
                  {closing && x.status === 'filled'
                    ? money(x.pnl, x.currency, { sign: true })
                    : money(x.quantity * x.fillPrice, x.currency, { compact: true })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- Trending pills */

export interface TrendItem {
  key: string;
  market: string;
  symbol: string;
  changePct: number;
}

export function TrendingPills({ items }: { items: TrendItem[] }) {
  const { t } = useLang();
  return (
    <section className="panel">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">{t('dash.trending.title')}</h2>
        <Link
          to="/charts"
          className="rounded-full bg-card px-4 py-1.5 text-sm font-semibold shadow-soft transition hover:text-primary active:shadow-neu-inset"
        >
          {t('nav.charts')}
        </Link>
      </header>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('ticker.waiting')}</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {items.map((x, i) => (
            <Link
              key={x.key}
              to={`/charts?market=${x.market}&symbol=${encodeURIComponent(x.symbol)}`}
              className={cn(
                'relative inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5',
                AVATAR[i % AVATAR.length],
              )}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/25 text-[10px]">
                {x.symbol.replace(/[^A-Z]/g, '').slice(0, 3)}
              </span>
              {x.symbol}
              <span
                className={cn(
                  'num absolute -right-1 -top-2.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-neu-sm',
                  x.changePct >= 0
                    ? 'bg-[hsl(152_70%_88%)] text-[hsl(158_72%_24%)]'
                    : 'bg-[hsl(6_90%_90%)] text-[hsl(6_76%_40%)]',
                )}
              >
                {pct(x.changePct)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- Quest checklist */

export function QuestList({ quests }: { quests: Quest[] }) {
  const { t } = useLang();
  return (
    <section className="panel">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">{t('dash.quests.title')}</h2>
        <Link to="/achievements" className="text-sm font-semibold text-primary hover:underline">
          {t('dash.quests.all')}
        </Link>
      </header>
      <ul className="space-y-2.5">
        {quests.slice(0, 4).map((q) => {
          const done = !!q.completedAt;
          const p = Math.min(100, (q.progress / q.target) * 100);
          return (
            <li key={q.key} className="neu-inset flex items-center gap-3 rounded-2xl px-3 py-2.5">
              {done ? (
                <CircleCheck className="h-5 w-5 shrink-0 text-win" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-muted-foreground/60" />
              )}
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    'truncate text-sm font-semibold',
                    done && 'text-muted-foreground line-through',
                  )}
                >
                  {q.title}
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-card">
                  <motion.div
                    className={cn('h-full rounded-full', done ? 'bg-win' : 'bg-primary')}
                    initial={{ width: 0 }}
                    animate={{ width: `${p}%` }}
                  />
                </div>
              </div>
              <span className="num shrink-0 rounded-full bg-warn/15 px-2 py-0.5 text-[11px] font-bold text-warn">
                +{q.xp}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- Learning ring */

export function LearningRing({ learned, total }: { learned: number; total: number }) {
  const { t } = useLang();
  const R = 40;
  const C = 2 * Math.PI * R;
  const f = total ? learned / total : 0;
  return (
    <Link
      to="/learn/terms"
      className="panel flex items-center gap-4 transition hover:-translate-y-0.5"
    >
      <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full bg-card shadow-soft">
        <svg viewBox="0 0 100 100" className="h-20 w-20 -rotate-90">
          <circle cx="50" cy="50" r={R} strokeWidth="9" className="fill-none stroke-background" />
          <motion.circle
            cx="50"
            cy="50"
            r={R}
            strokeWidth="9"
            strokeLinecap="round"
            className="fill-none stroke-c-green"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: C * (1 - f) }}
            transition={{ duration: 1 }}
          />
        </svg>
        <span className="num absolute text-sm font-bold">
          {learned}/{total}
        </span>
      </div>
      <div>
        <div className="font-display text-lg font-bold">{t('dash.learn.title')}</div>
        <p className="text-sm text-muted-foreground">
          {learned === 0 ? t('dash.learn.start') : t('dash.learn.progress', { n: total - learned })}
        </p>
      </div>
    </Link>
  );
}

import type { TradeRecord, WalletRecord } from '../store/types.js';
import type { Currency } from '../types.js';
import { equity } from './paperWallet.js';
import { type EquityPoint, type PerformanceStats, computeStats } from './stats.js';

export interface StrategyRow extends PerformanceStats {
  market: string;
  strategy: string;
  currency: Currency;
  equity: number;
  startingCash: number;
  openPositions: number;
}

export interface PortfolioSummary {
  totals: Partial<Record<Currency, { equity: number; startingCash: number; pnl: number; pnlPct: number; costsPaid: number }>>;
  strategies: StrategyRow[];
  realizedCurve: Partial<Record<Currency, EquityPoint[]>>;
}

const isClosing = (t: TradeRecord) => t.status === 'filled' && (t.side === 'sell' || t.side === 'arb');

/** prices keys are "market:symbol". */
export function summarize(wallets: WalletRecord[], trades: TradeRecord[], prices: Record<string, number>): PortfolioSummary {
  const sorted = [...trades].sort((a, b) => a.time - b.time);
  const strategies: StrategyRow[] = wallets.map((w) => {
    const own = sorted.filter((t) => t.market === w.market && t.strategy === w.strategy && isClosing(t));
    const marketPrices = Object.fromEntries(
      w.positions.map((p) => [p.symbol, prices[`${w.market}:${p.symbol}`] ?? p.avgPrice]),
    );
    const eq = equity(w, marketPrices);
    // Realized equity curve: starting cash + cumulative realized PnL, plus the current mark.
    let running = w.startingCash;
    const curve: EquityPoint[] = [{ time: w.createdAt, equity: w.startingCash }];
    for (const t of own) curve.push({ time: t.time, equity: (running += t.pnl) });
    curve.push({ time: Date.now(), equity: eq });
    const stats = computeStats(own, curve, w.startingCash, w.feesPaid + w.taxesPaid);
    return {
      ...stats,
      maxDrawdownPct: Math.max(stats.maxDrawdownPct, w.maxDrawdownPct),
      market: w.market,
      strategy: w.strategy,
      currency: w.currency,
      equity: eq,
      startingCash: w.startingCash,
      openPositions: w.positions.length,
    };
  });

  const totals: PortfolioSummary['totals'] = {};
  for (const row of strategies) {
    const t = (totals[row.currency] ??= { equity: 0, startingCash: 0, pnl: 0, pnlPct: 0, costsPaid: 0 });
    t.equity += row.equity;
    t.startingCash += row.startingCash;
    t.costsPaid += row.costsPaid;
  }
  for (const t of Object.values(totals)) {
    t.pnl = t.equity - t.startingCash;
    t.pnlPct = t.startingCash ? (t.pnl / t.startingCash) * 100 : 0;
  }

  const realizedCurve: PortfolioSummary['realizedCurve'] = {};
  for (const cur of Object.keys(totals) as Currency[]) {
    let running = totals[cur]!.startingCash;
    const pts: EquityPoint[] = [];
    const first = Math.min(...wallets.filter((w) => w.currency === cur).map((w) => w.createdAt));
    pts.push({ time: first, equity: running });
    for (const t of sorted) if (t.currency === cur && isClosing(t)) pts.push({ time: t.time, equity: (running += t.pnl) });
    realizedCurve[cur] = pts;
  }

  return { totals, strategies, realizedCurve };
}

/**
 * Leaderboard: risk-adjusted (Sharpe) first; strategies with too few trades are listed after,
 * unranked, because a handful of lucky trades says nothing.
 */
export function leaderboard(rows: StrategyRow[]): (StrategyRow & { rank: number | null })[] {
  const ranked = rows.filter((r) => r.ranked && r.sharpe !== null).sort((a, b) => b.sharpe! - a.sharpe!);
  const unranked = rows.filter((r) => !ranked.includes(r)).sort((a, b) => b.trades - a.trades);
  return [...ranked.map((r, i) => ({ ...r, rank: i + 1 })), ...unranked.map((r) => ({ ...r, rank: null }))];
}

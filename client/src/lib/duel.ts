import type { Currency, DuelMarket, EquityPoint, StrategyRow } from './types';

export const STARTING_CASH: Record<Currency, number> = { USD: 10_000, INR: 1_000_000 };

export interface Side {
  equity: number;
  startingCash: number;
  pnl: number;
  pnlPct: number;
  trades: number;
  winRatePct: number;
  openPositions: number;
}

/** One side of the match, with the latest live equity folded in when we have it. */
export function sideOf(row: StrategyRow | null, currency: Currency, liveEquity?: number): Side {
  const startingCash = row?.startingCash ?? STARTING_CASH[currency];
  const equity = liveEquity ?? row?.equity ?? startingCash;
  const pnl = equity - startingCash;
  return {
    equity,
    startingCash,
    pnl,
    pnlPct: startingCash ? (pnl / startingCash) * 100 : 0,
    trades: row?.trades ?? 0,
    winRatePct: row?.winRatePct ?? 0,
    openPositions: row?.openPositions ?? 0,
  };
}

export type Leader = 'you' | 'bot' | 'tie';

/** Ties within a hundredth of a percent, so tiny rounding noise is not called a lead. */
export function leader(you: Side, bot: Side): Leader {
  const d = you.pnlPct - bot.pnlPct;
  return Math.abs(d) < 0.01 ? 'tie' : d > 0 ? 'you' : 'bot';
}

export interface DuelPoint {
  time: number;
  you?: number;
  bot?: number;
}

/** Merges both equity histories onto one time axis for a two-line chart. */
export function mergeHistory(you: EquityPoint[], bot: EquityPoint[]): DuelPoint[] {
  const map = new Map<number, DuelPoint>();
  for (const p of you) map.set(p.time, { ...map.get(p.time), time: p.time, you: p.equity });
  for (const p of bot) map.set(p.time, { ...map.get(p.time), time: p.time, bot: p.equity });
  return [...map.values()].sort((a, b) => a.time - b.time);
}

export const duelKey = (d: Pick<DuelMarket, 'market'>, side: 'user' | 'auto') =>
  `${d.market}:${side}`;

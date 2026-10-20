export interface ClosedTrade {
  pnl: number;
  fees: number;
  taxes: number;
}

export interface EquityPoint {
  time: number;
  equity: number;
}

export interface PerformanceStats {
  trades: number;
  wins: number;
  losses: number;
  winRatePct: number;
  totalReturnPct: number;
  netPnl: number;
  costsPaid: number;
  maxDrawdownPct: number;
  sharpe: number | null;
  profitFactor: number | null;
  avgWin: number;
  avgLoss: number;
  /** Ranking is only meaningful with enough trades. */
  ranked: boolean;
}

export const MIN_TRADES_FOR_RANKING = 30;

export function maxDrawdownPct(curve: EquityPoint[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const p of curve) {
    peak = Math.max(peak, p.equity);
    if (peak > 0) worst = Math.max(worst, ((peak - p.equity) / peak) * 100);
  }
  return worst;
}

/** Per-period Sharpe of equity returns (not annualized; comparable across strategies on one market). */
export function sharpe(curve: EquityPoint[]): number | null {
  if (curve.length < 3) return null;
  const rets: number[] = [];
  for (let i = 1; i < curve.length; i++) {
    const prev = curve[i - 1].equity;
    if (prev > 0) rets.push(curve[i].equity / prev - 1);
  }
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / Math.max(1, rets.length - 1);
  const sd = Math.sqrt(variance);
  return sd === 0 ? null : mean / sd;
}

/** `totalCosts` should include buy-side costs too (wallet feesPaid + taxesPaid); defaults to closed-trade costs. */
export function computeStats(
  closed: ClosedTrade[],
  curve: EquityPoint[],
  startingCash: number,
  totalCosts?: number,
): PerformanceStats {
  const wins = closed.filter((t) => t.pnl > 0);
  const losses = closed.filter((t) => t.pnl <= 0);
  const grossWin = wins.reduce((a, t) => a + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
  const finalEquity = curve.at(-1)?.equity ?? startingCash;
  return {
    trades: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRatePct: closed.length ? (wins.length / closed.length) * 100 : 0,
    totalReturnPct: ((finalEquity - startingCash) / startingCash) * 100,
    netPnl: finalEquity - startingCash,
    costsPaid: totalCosts ?? closed.reduce((a, t) => a + t.fees + t.taxes, 0),
    maxDrawdownPct: maxDrawdownPct(curve),
    sharpe: sharpe(curve),
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : null,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? -grossLoss / losses.length : 0,
    ranked: closed.length >= MIN_TRADES_FOR_RANKING,
  };
}

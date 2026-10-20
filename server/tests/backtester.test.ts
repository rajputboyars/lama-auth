import { describe, expect, it } from 'vitest';
import { arbitrage } from '../src/strategies/arbitrage.js';
import { trendFollowing } from '../src/strategies/trendFollowing.js';
import { runBacktest } from '../src/services/backtester.js';
import { DEFAULT_COSTS } from '../src/services/costModel.js';
import { DEFAULT_RISK } from '../src/services/riskManager.js';
import { computeStats, maxDrawdownPct } from '../src/services/stats.js';
import { candlesFromCloses, upThenDown } from './helpers.js';

const input = () => ({
  market: 'crypto' as const,
  symbol: 'X',
  currency: 'USD' as const,
  candles: candlesFromCloses(upThenDown()),
  strategy: trendFollowing,
  costs: { ...DEFAULT_COSTS.crypto, failChance: 0 },
  risk: DEFAULT_RISK,
});

describe('backtester', () => {
  it('replays candles and produces a round trip', () => {
    const r = runBacktest(input());
    expect(r.trades.map((t) => t.side)).toEqual(['buy', 'sell']);
    expect(r.equityCurve).toHaveLength(input().candles.length);
    expect(r.stats.trades).toBe(1);
  });

  it('fills at the NEXT candle open, never the signal candle', () => {
    const inp = input();
    const r = runBacktest(inp);
    const buy = r.trades[0];
    const idx = inp.candles.findIndex((c) => c.time === buy.time);
    expect(idx).toBeGreaterThan(0);
    expect(buy.price).toBeGreaterThan(inp.candles[idx].open); // open + spread/slippage
  });

  it('costs make results strictly worse than a zero-cost run', () => {
    const real = runBacktest(input());
    const free = runBacktest({
      ...input(),
      costs: {
        feePct: 0,
        feeFixed: 0,
        feeMin: 0,
        taxes: [],
        spreadPct: 0,
        slippagePct: 0,
        delayMs: 0,
        failChance: 0,
      },
    });
    expect(real.stats.netPnl).toBeLessThan(free.stats.netPnl);
    expect(real.stats.costsPaid).toBeGreaterThan(0);
  });

  it('is deterministic for a given seed and counts failed orders', () => {
    const inp = { ...input(), costs: { ...DEFAULT_COSTS.crypto, failChance: 0.5 }, seed: 3 };
    const a = runBacktest(inp);
    const b = runBacktest(inp);
    expect(a.trades).toEqual(b.trades);
    expect(a.failedOrders).toBe(b.failedOrders);
  });

  it('warns that small samples are not meaningful', () => {
    const r = runBacktest(input());
    expect(r.stats.ranked).toBe(false);
    expect(r.notes.join(' ')).toMatch(/too few/);
  });

  it('refuses strategies that cannot be backtested and too-short data', () => {
    expect(() => runBacktest({ ...input(), strategy: arbitrage })).toThrow(/cannot be backtested/);
    expect(() => runBacktest({ ...input(), candles: input().candles.slice(0, 10) })).toThrow(
      /at least/,
    );
  });
});

describe('stats', () => {
  it('computes drawdown from the equity curve', () => {
    const curve = [100, 120, 90, 130].map((equity, time) => ({ time, equity }));
    expect(maxDrawdownPct(curve)).toBeCloseTo(25);
  });
  it('computes win rate and profit factor', () => {
    const s = computeStats(
      [
        { pnl: 10, fees: 1, taxes: 0 },
        { pnl: -5, fees: 1, taxes: 0 },
      ],
      [
        { time: 0, equity: 100 },
        { time: 1, equity: 105 },
      ],
      100,
    );
    expect(s.winRatePct).toBe(50);
    expect(s.profitFactor).toBe(2);
    expect(s.totalReturnPct).toBeCloseTo(5);
  });
});

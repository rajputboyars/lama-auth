import { describe, expect, it } from 'vitest';
import { arbitrage } from '../src/strategies/arbitrage.js';
import { breakout } from '../src/strategies/breakout.js';
import { rsi, sma } from '../src/strategies/indicators.js';
import { STRATEGIES, strategiesFor } from '../src/strategies/index.js';
import { meanReversion } from '../src/strategies/meanReversion.js';
import { trendFollowing } from '../src/strategies/trendFollowing.js';
import { DEFAULT_COSTS } from '../src/services/costModel.js';
import type { Candle, Position } from '../src/types.js';
import { candlesFromCloses, upThenDown } from './helpers.js';

const held: Position = { symbol: 'X', quantity: 1, avgPrice: 100, openedAt: 0 };

/** Runs the strategy over growing windows and returns the actions it takes (as a simple long-only simulation). */
function actions(candles: Candle[], check: (c: Candle[], p: Position | null) => { action: string }) {
  const out: { i: number; action: string }[] = [];
  let pos: Position | null = null;
  for (let i = 1; i <= candles.length; i++) {
    const s = check(candles.slice(0, i), pos);
    if (s.action === 'buy') pos = held;
    if (s.action === 'sell') pos = null;
    if (s.action !== 'wait') out.push({ i, action: s.action });
  }
  return out;
}

describe('indicators', () => {
  it('sma averages the last N values', () => {
    expect(sma([1, 2, 3, 4], 2)).toBe(3.5);
    expect(sma([1], 2)).toBeNull();
  });
  it('rsi is 100 on only gains and low on only losses', () => {
    expect(rsi([1, 2, 3, 4, 5, 6], 3)).toBe(100);
    expect(rsi([6, 5, 4, 3, 2, 1], 3)).toBe(0);
  });
});

describe('every strategy', () => {
  it('has the shared interface', () => {
    for (const s of STRATEGIES) {
      expect(s.name).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(typeof s.check).toBe('function');
    }
  });
  it('waits with a reason when there is not enough data', () => {
    for (const s of STRATEGIES) {
      const sig = s.check(candlesFromCloses([100, 101]), null);
      expect(sig.action).toBe('wait');
      expect(sig.reason.length).toBeGreaterThan(0);
    }
  });
  it('arbitrage is crypto only', () => {
    expect(strategiesFor('us').map((s) => s.id)).not.toContain('arbitrage');
    expect(strategiesFor('crypto').map((s) => s.id)).toContain('arbitrage');
  });
});

describe('trend following', () => {
  it('buys on the cross up and sells on the cross down', () => {
    const acts = actions(candlesFromCloses(upThenDown()), (c, p) => trendFollowing.check(c, p));
    expect(acts.map((a) => a.action)).toEqual(['buy', 'sell']);
    expect(acts[0].i).toBeGreaterThan(40);
    expect(acts[1].i).toBeGreaterThan(80);
  });
  it('rejects fast >= slow', () => {
    const sig = trendFollowing.check(candlesFromCloses(upThenDown()), null, { fast: 30, slow: 30 });
    expect(sig.action).toBe('wait');
  });
});

describe('mean reversion', () => {
  it('buys a sharp selloff and exits on recovery', () => {
    const closes = [
      ...Array.from({ length: 30 }, (_, i) => 100 + (i % 2 ? 0.5 : -0.5)),
      ...Array.from({ length: 8 }, (_, i) => 99 - (i + 1) * 2),
      ...Array.from({ length: 15 }, (_, i) => 83 + (i + 1) * 1.5),
    ];
    const acts = actions(candlesFromCloses(closes), (c, p) => meanReversion.check(c, p));
    expect(acts[0]?.action).toBe('buy');
    expect(acts[1]?.action).toBe('sell');
  });
});

describe('breakout', () => {
  it('buys a new 20-period high and exits below the 10-period low', () => {
    const closes = [
      ...Array.from({ length: 25 }, (_, i) => 100 + (i % 3)),
      110,
      112,
      ...Array.from({ length: 12 }, (_, i) => 111 - (i + 1) * 2),
    ];
    const acts = actions(candlesFromCloses(closes), (c, p) => breakout.check(c, p));
    expect(acts.map((a) => a.action)).toEqual(['buy', 'sell']);
    expect(acts[0].i).toBe(26);
  });
});

describe('arbitrage', () => {
  const quotes = (a: number, b: number) => [
    { symbol: 'BTC', price: a, time: 0, source: 'kraken' },
    { symbol: 'BTC', price: b, time: 0, source: 'binance' },
  ];
  const ctx = (a: number, b: number) => ({ venueQuotes: quotes(a, b), costs: DEFAULT_COSTS.crypto });

  it('waits when the gap does not cover round-trip costs', () => {
    expect(arbitrage.check([], null, undefined, ctx(100, 100.2)).action).toBe('wait');
  });
  it('signals when the gap beats costs plus margin, naming both venues', () => {
    const sig = arbitrage.check([], null, undefined, ctx(100, 101.5));
    expect(sig.action).toBe('buy');
    expect(sig.reason).toContain('kraken');
    expect(sig.reason).toContain('binance');
  });
  it('waits without two venues', () => {
    expect(arbitrage.check([], null, undefined, { venueQuotes: [], costs: DEFAULT_COSTS.crypto }).action).toBe('wait');
  });
});

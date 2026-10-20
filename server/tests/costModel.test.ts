import { describe, expect, it } from 'vitest';
import {
  type CostConfig,
  DEFAULT_COSTS,
  estimateCosts,
  fillPriceFor,
  rollFailure,
} from '../src/services/costModel.js';

const cfg: CostConfig = {
  feePct: 0.1,
  feeFixed: 0,
  feeMin: 0,
  taxes: [],
  spreadPct: 0.2,
  slippagePct: 0.1,
  delayMs: 0,
  failChance: 0,
};

describe('costModel', () => {
  it('buys above mid and sells below mid', () => {
    expect(fillPriceFor('buy', 100, cfg)).toBeCloseTo(100.2); // half spread 0.1 + slippage 0.1
    expect(fillPriceFor('sell', 100, cfg)).toBeCloseTo(99.8);
  });

  it('charges percentage fees on the filled notional', () => {
    const c = estimateCosts({ side: 'buy', symbol: 'X', quantity: 10, price: 100 }, cfg);
    expect(c.notional).toBeCloseTo(1002);
    expect(c.fees).toBeCloseTo(1.002);
    expect(c.spreadCost).toBeCloseTo(1);
    expect(c.slippageCost).toBeCloseTo(1);
    expect(c.total).toBeCloseTo(c.fees + c.taxes);
  });

  it('applies minimum and maximum fees', () => {
    expect(
      estimateCosts({ side: 'buy', symbol: 'X', quantity: 1, price: 1 }, { ...cfg, feeMin: 5 })
        .fees,
    ).toBe(5);
    expect(
      estimateCosts({ side: 'buy', symbol: 'X', quantity: 1e6, price: 100 }, { ...cfg, feeMax: 20 })
        .fees,
    ).toBe(20);
  });

  it('models Indian delivery charges: STT both sides, stamp on buy, DP on sell, GST on fees', () => {
    const india = DEFAULT_COSTS.india;
    const buy = estimateCosts({ side: 'buy', symbol: 'TCS', quantity: 10, price: 4000 }, india);
    const sell = estimateCosts({ side: 'sell', symbol: 'TCS', quantity: 10, price: 4000 }, india);
    const stt = buy.notional * 0.001;
    const stamp = buy.notional * 0.00015;
    const gst = buy.fees * 0.18;
    expect(buy.taxes).toBeCloseTo(stt + stamp + gst, 6);
    expect(sell.taxes).toBeCloseTo(sell.notional * 0.001 + sell.fees * 0.18 + 15.93, 6);
  });

  it('only charges US regulatory fees on sells', () => {
    const us = DEFAULT_COSTS.us;
    expect(estimateCosts({ side: 'buy', symbol: 'AAPL', quantity: 10, price: 200 }, us).taxes).toBe(
      0,
    );
    expect(
      estimateCosts({ side: 'sell', symbol: 'AAPL', quantity: 10, price: 200 }, us).taxes,
    ).toBeGreaterThan(0);
  });

  it('a round trip at an unchanged price always loses money', () => {
    for (const market of Object.values(DEFAULT_COSTS)) {
      const buy = estimateCosts({ side: 'buy', symbol: 'X', quantity: 5, price: 100 }, market);
      const sell = estimateCosts({ side: 'sell', symbol: 'X', quantity: 5, price: 100 }, market);
      expect(sell.notional - sell.total - (buy.notional + buy.total)).toBeLessThan(0);
    }
  });

  it('rejects invalid trades', () => {
    expect(() => estimateCosts({ side: 'buy', symbol: 'X', quantity: 0, price: 1 }, cfg)).toThrow();
  });

  it('rollFailure follows the configured chance', () => {
    expect(rollFailure({ ...cfg, failChance: 0.5 }, () => 0.4)).toBe(true);
    expect(rollFailure({ ...cfg, failChance: 0.5 }, () => 0.6)).toBe(false);
    expect(rollFailure({ ...cfg, failChance: 0 }, () => 0)).toBe(false);
  });
});

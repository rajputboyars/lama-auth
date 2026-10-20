import { describe, expect, it } from 'vitest';
import { DEFAULT_RISK, type RiskInput, dailyLossPct, evaluate } from '../src/services/riskManager.js';

const base: RiskInput = {
  action: 'buy',
  price: 100,
  equity: 10_000,
  cash: 10_000,
  openPositions: 0,
  heldQuantity: 0,
  dayStartEquity: 10_000,
};

describe('riskManager', () => {
  it('sizes buys at maxTradePct of equity', () => {
    const d = evaluate(base, DEFAULT_RISK);
    expect(d.allowed).toBe(true);
    if (d.allowed) expect(d.quantity).toBeCloseTo(10); // 10% of 10k / 100
  });

  it('caps by absolute max trade value', () => {
    const d = evaluate(base, { ...DEFAULT_RISK, maxTradeValue: 250 });
    expect(d.allowed && d.quantity).toBeCloseTo(2.5);
  });

  it('never sizes beyond available cash', () => {
    const d = evaluate({ ...base, cash: 300 }, DEFAULT_RISK);
    expect(d.allowed && d.quantity * 100).toBeLessThan(300);
  });

  it('blocks new buys after the daily loss limit', () => {
    const d = evaluate({ ...base, equity: 9_600 }, DEFAULT_RISK); // -4% vs 3% limit
    expect(d).toMatchObject({ allowed: false, block: 'daily_loss_limit' });
  });

  it('still allows exits after the daily loss limit', () => {
    const d = evaluate({ ...base, action: 'sell', equity: 9_000, heldQuantity: 5 }, DEFAULT_RISK);
    expect(d).toMatchObject({ allowed: true, quantity: 5 });
  });

  it('blocks new positions beyond the max open positions', () => {
    const d = evaluate({ ...base, openPositions: 3 }, DEFAULT_RISK);
    expect(d).toMatchObject({ allowed: false, block: 'max_positions' });
  });

  it('kill switch blocks everything, including exits', () => {
    const cfg = { ...DEFAULT_RISK, killSwitch: true };
    expect(evaluate(base, cfg)).toMatchObject({ allowed: false, block: 'kill_switch' });
    expect(evaluate({ ...base, action: 'sell', heldQuantity: 1 }, cfg)).toMatchObject({ allowed: false });
  });

  it('cannot sell without a position', () => {
    expect(evaluate({ ...base, action: 'sell' }, DEFAULT_RISK)).toMatchObject({ allowed: false, block: 'no_position' });
  });

  it('computes daily loss as a positive percentage only', () => {
    expect(dailyLossPct(100, 95)).toBeCloseTo(5);
    expect(dailyLossPct(100, 110)).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { estimateCosts } from '../src/services/costModel.js';
import { DEFAULT_COSTS } from '../src/services/costModel.js';
import {
  applyBuy,
  applySell,
  createWallet,
  equity,
  findPosition,
  resetWallet,
  updateDrawdown,
} from '../src/services/paperWallet.js';

const costs = DEFAULT_COSTS.crypto;
const buyAt = (q: number, p: number) =>
  estimateCosts({ side: 'buy', symbol: 'BTC', quantity: q, price: p }, costs);
const sellAt = (q: number, p: number) =>
  estimateCosts({ side: 'sell', symbol: 'BTC', quantity: q, price: p }, costs);

describe('paperWallet', () => {
  it('starts with the default cash for the currency', () => {
    expect(createWallet('crypto', 'trend', 'USD').cash).toBe(10_000);
    expect(createWallet('india', 'trend', 'INR').cash).toBe(1_000_000);
  });

  it('buy deducts notional plus costs and records the position cost basis', () => {
    const w = createWallet('crypto', 'trend', 'USD');
    const c = buyAt(10, 100);
    const { wallet } = applyBuy(w, 'BTC', 10, c);
    expect(wallet.cash).toBeCloseTo(10_000 - c.notional - c.total, 6);
    const pos = findPosition(wallet, 'BTC')!;
    expect(pos.quantity).toBe(10);
    expect(pos.avgPrice).toBeGreaterThan(100); // includes spread, slippage and fees
    expect(wallet.feesPaid).toBeCloseTo(c.fees);
  });

  it('averages the cost basis across buys', () => {
    let w = createWallet('crypto', 'trend', 'USD');
    w = applyBuy(w, 'BTC', 1, buyAt(1, 100)).wallet;
    w = applyBuy(w, 'BTC', 1, buyAt(1, 200)).wallet;
    const pos = findPosition(w, 'BTC')!;
    expect(pos.quantity).toBe(2);
    expect(pos.avgPrice).toBeGreaterThan(150);
    expect(pos.avgPrice).toBeLessThan(151);
  });

  it('sell realizes PnL net of both sides of costs', () => {
    let w = createWallet('crypto', 'trend', 'USD');
    w = applyBuy(w, 'BTC', 10, buyAt(10, 100)).wallet;
    const res = applySell(w, 'BTC', 10, sellAt(10, 100));
    expect(res.pnl).toBeLessThan(0); // flat price = loss after costs
    expect(res.wallet.positions).toHaveLength(0);
    expect(res.wallet.cash).toBeCloseTo(10_000 + res.pnl, 6);
    expect(res.wallet.realizedPnl).toBeCloseTo(res.pnl);
  });

  it('refuses to overspend or sell what it does not hold', () => {
    const w = createWallet('crypto', 'trend', 'USD');
    expect(() => applyBuy(w, 'BTC', 1000, buyAt(1000, 100))).toThrow(/Insufficient/);
    expect(() => applySell(w, 'BTC', 1, sellAt(1, 100))).toThrow(/not held/);
  });

  it('marks to market and tracks max drawdown', () => {
    let w = createWallet('crypto', 'trend', 'USD');
    w = applyBuy(w, 'BTC', 50, buyAt(50, 100)).wallet;
    const eqUp = equity(w, { BTC: 120 });
    w = updateDrawdown(w, eqUp);
    const eqDown = equity(w, { BTC: 80 });
    w = updateDrawdown(w, eqDown);
    expect(w.peakEquity).toBeCloseTo(eqUp);
    expect(w.maxDrawdownPct).toBeCloseTo(((eqUp - eqDown) / eqUp) * 100);
  });

  it('reset restores starting cash and clears history', () => {
    let w = createWallet('crypto', 'trend', 'USD');
    w = applyBuy(w, 'BTC', 10, buyAt(10, 100)).wallet;
    const r = resetWallet(w);
    expect(r.cash).toBe(10_000);
    expect(r.positions).toHaveLength(0);
    expect(r.feesPaid).toBe(0);
  });
});

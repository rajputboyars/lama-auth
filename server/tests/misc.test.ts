import { describe, expect, it } from 'vitest';
import { CryptoAdapter } from '../src/adapters/crypto.js';
import { SESSIONS, isSessionOpen } from '../src/adapters/marketHours.js';
import { DisabledLiveBroker } from '../src/live/liveBroker.js';
import { DEFAULT_COSTS } from '../src/services/costModel.js';
import { cleanCandles, isSaneTick } from '../src/services/dataGuard.js';
import { leaderboard } from '../src/services/portfolio.js';
import { RateLimiter, withRetry } from '../src/services/retry.js';
import { SettingsPatchSchema, applySettingsPatch, defaultSettings } from '../src/services/settings.js';

describe('dataGuard', () => {
  it('rejects jumps beyond the threshold and non-positive prices', () => {
    expect(isSaneTick(100, 105, 10)).toBe(true);
    expect(isSaneTick(100, 111, 10)).toBe(false);
    expect(isSaneTick(undefined, 50, 10)).toBe(true);
    expect(isSaneTick(100, 0, 10)).toBe(false);
    expect(isSaneTick(100, NaN, 10)).toBe(false);
  });
  it('drops inconsistent and spiking candles', () => {
    const c = (close: number, high = close + 1, low = close - 1) => ({ open: close, high, low, close });
    expect(cleanCandles([c(100), c(300), c(101), c(102, 90)], 10)).toEqual([c(100), c(101)]);
  });
});

describe('market hours', () => {
  it('US is open 09:30-16:00 New York on weekdays', () => {
    expect(isSessionOpen(SESSIONS.us, new Date('2026-10-20T14:00:00Z'))).toBe(true); // 10:00 EDT Tue
    expect(isSessionOpen(SESSIONS.us, new Date('2026-10-20T21:00:00Z'))).toBe(false); // 17:00 EDT
    expect(isSessionOpen(SESSIONS.us, new Date('2026-10-18T15:00:00Z'))).toBe(false); // Sunday
  });
  it('India is open 09:15-15:30 IST', () => {
    expect(isSessionOpen(SESSIONS.india, new Date('2026-10-20T04:00:00Z'))).toBe(true); // 09:30 IST
    expect(isSessionOpen(SESSIONS.india, new Date('2026-10-20T10:30:00Z'))).toBe(false); // 16:00 IST
  });
});

describe('retry + rate limit', () => {
  it('retries then succeeds', async () => {
    let n = 0;
    const v = await withRetry(async () => (++n < 3 ? Promise.reject(new Error('x')) : 'ok'), { baseMs: 1 });
    expect(v).toBe('ok');
    expect(n).toBe(3);
  });
  it('gives up after the retry budget', async () => {
    await expect(withRetry(() => Promise.reject(new Error('down')), { retries: 1, baseMs: 1 })).rejects.toThrow('down');
  });
  it('spaces calls apart', async () => {
    const limiter = new RateLimiter(20);
    const t0 = Date.now();
    await Promise.all([1, 2, 3].map(() => limiter.schedule(async () => Date.now())));
    expect(Date.now() - t0).toBeGreaterThanOrEqual(35);
  });
});

describe('crypto adapter', () => {
  const ex = (id: string, price: number | null) => ({
    id,
    fetchTicker: async () => (price === null ? Promise.reject(new Error('down')) : { last: price, timestamp: 1 }),
    fetchOHLCV: async () => [[1, 1, 2, 0.5, 1.5, 10]],
  });
  it('quotes the primary exchange and maps OHLCV', async () => {
    const a = new CryptoAdapter([ex('kraken', 100)], ['BTC/USDT'], DEFAULT_COSTS.crypto);
    expect((await a.getPrice('BTC/USDT')).price).toBe(100);
    expect(await a.getCandles('BTC/USDT', '1m', 1)).toEqual([{ time: 1, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 }]);
    expect(a.isOpen()).toBe(true);
  });
  it('venue quotes skip exchanges that fail', async () => {
    const a = new CryptoAdapter([ex('kraken', 100), ex('down', null), ex('binance', 101)], ['BTC/USDT'], DEFAULT_COSTS.crypto);
    const q = await a.getVenueQuotes('BTC/USDT');
    expect(q.map((x) => x.source)).toEqual(['kraken', 'binance']);
  });
});

describe('settings', () => {
  it('validates and merges partial updates', () => {
    const patch = SettingsPatchSchema.parse({ risk: { maxOpenPositions: 5 }, strategies: { trend: { params: { fast: 5 } } } });
    const next = applySettingsPatch(defaultSettings(), patch);
    expect(next.risk.maxOpenPositions).toBe(5);
    expect(next.risk.dailyLossLimitPct).toBe(3);
    expect(next.strategies.trend.params).toMatchObject({ fast: 5, slow: 30 });
  });
  it('rejects bad values and unknown keys', () => {
    expect(SettingsPatchSchema.safeParse({ risk: { maxTradePct: 500 } }).success).toBe(false);
    expect(SettingsPatchSchema.safeParse({ botRunning: true }).success).toBe(false);
    expect(() => applySettingsPatch(defaultSettings(), { strategies: { nope: { enabled: true } } })).toThrow();
  });
});

describe('leaderboard', () => {
  const row = (strategy: string, trades: number, sharpe: number | null, netPnl: number) =>
    ({ strategy, trades, sharpe, netPnl, ranked: trades >= 30 }) as never;
  it('ranks by risk-adjusted return, not raw profit, and leaves small samples unranked', () => {
    const out = leaderboard([row('big-profit', 40, 0.1, 5000), row('steady', 40, 0.5, 800), row('lucky', 3, 2, 9000)]);
    expect(out.map((r) => [r.strategy, r.rank])).toEqual([
      ['steady', 1],
      ['big-profit', 2],
      ['lucky', null],
    ]);
  });
});

describe('live trading', () => {
  it('is disabled: every order is refused', async () => {
    const b = new DisabledLiveBroker();
    await expect(b.placeOrder()).rejects.toThrow(/disabled/);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import type { MarketAdapter } from '../src/adapters/types.js';
import { BotEngine } from '../src/bot/engine.js';
import { MemoryStore } from '../src/store/memoryStore.js';
import type { TradeRecord } from '../src/store/types.js';
import type { MarketId } from '../src/types.js';
import { FakeAdapter, candlesFromCloses, upThenDown } from './helpers.js';

function setup() {
  const adapter = new FakeAdapter();
  const store = new MemoryStore();
  // Only the trend strategy, so the test is about the engine, not strategy interplay.
  for (const id of Object.keys(store.settings.strategies)) store.settings.strategies[id].enabled = id === 'trend';
  store.settings.costs.crypto = { ...store.settings.costs.crypto, delayMs: 0, failChance: 0 };
  const engine = new BotEngine(new Map<MarketId, MarketAdapter>([['crypto', adapter]]), store, {
    maxTickJumpPct: 10,
    sleep: async () => {},
    rng: () => 0.99,
  });
  return { adapter, store, engine };
}

/** Feeds the engine one candle at a time like a live market. */
async function replay(adapter: FakeAdapter, engine: BotEngine, closes: number[]) {
  const all = candlesFromCloses(closes);
  for (let i = 1; i <= all.length; i++) {
    adapter.candles = all.slice(0, i);
    adapter.prices['BTC/USDT'] = all[i - 1].close;
    await engine.tickMarket('crypto');
  }
}

describe('BotEngine', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => (ctx = setup()));

  it('trades a full cycle with costs and keeps the wallet consistent', async () => {
    const trades: TradeRecord[] = [];
    ctx.engine.on('trade:new', (t) => trades.push(t));
    await replay(ctx.adapter, ctx.engine, upThenDown());

    expect(trades.map((t) => t.side)).toEqual(['buy', 'sell']);
    expect(trades.every((t) => t.status === 'filled' && t.fees > 0)).toBe(true);
    const w = await ctx.store.getWallet('crypto', 'trend');
    expect(w!.positions).toHaveLength(0);
    expect(w!.cash).toBeCloseTo(10_000 + trades[1].pnl, 4);
    expect(ctx.store.signals.filter((s) => s.taken)).toHaveLength(2);
  });

  it('stores candles and emits price updates', async () => {
    const prices: unknown[] = [];
    ctx.engine.on('price:update', (p) => prices.push(p));
    await replay(ctx.adapter, ctx.engine, [100, 101, 102]);
    expect(prices).toHaveLength(3);
    expect(await ctx.store.getCandles('crypto', 'BTC/USDT', '1m')).toHaveLength(3);
  });

  it('ignores a bad tick that jumps too far', async () => {
    await replay(ctx.adapter, ctx.engine, [100]);
    const prices: unknown[] = [];
    ctx.engine.on('price:update', (p) => prices.push(p));
    ctx.adapter.prices['BTC/USDT'] = 500;
    await ctx.engine.tickMarket('crypto');
    expect(prices).toHaveLength(0);
    expect(ctx.engine.latestPrices()['crypto:BTC/USDT']).toBe(100);
  });

  it('skips closed markets', async () => {
    ctx.adapter.open = false;
    await ctx.engine.tickMarket('crypto');
    expect((await ctx.engine.status()).markets.crypto.status).toBe('closed');
    expect(ctx.store.candles.size).toBe(0);
  });

  it('halts every market when the kill switch is on', async () => {
    ctx.store.settings.risk.killSwitch = true;
    await replay(ctx.adapter, ctx.engine, upThenDown());
    expect(ctx.store.trades).toHaveLength(0);
    expect((await ctx.engine.status()).markets.crypto.status).toBe('halted');
  });

  it('contains adapter errors without throwing', async () => {
    ctx.adapter.failPrice = true;
    await expect(ctx.engine.tickMarket('crypto')).resolves.toBeUndefined();
    const st = (await ctx.engine.status()).markets.crypto;
    expect(st.status).toBe('error');
    expect(st.consecutiveErrors).toBe(1);
  });

  it('records failed orders as failed trades and leaves the wallet alone', async () => {
    const failing = new BotEngine(new Map([['crypto', ctx.adapter]]), ctx.store, {
      maxTickJumpPct: 10,
      sleep: async () => {},
      rng: () => 0,
    });
    ctx.store.settings.costs.crypto.failChance = 0.5;
    await replay(ctx.adapter, failing, upThenDown());
    expect(ctx.store.trades.length).toBeGreaterThan(0);
    expect(ctx.store.trades.every((t) => t.status === 'failed')).toBe(true);
    const w = await ctx.store.getWallet('crypto', 'trend');
    expect(w!.cash).toBe(10_000);
  });

  it('records signals blocked by risk with a reason', async () => {
    ctx.store.settings.risk.maxOpenPositions = 1;
    await ctx.store.saveWallet({
      ...(await import('../src/services/paperWallet.js')).createWallet('crypto', 'trend', 'USD'),
      positions: [{ symbol: 'ETH/USDT', quantity: 1, avgPrice: 10, openedAt: 0 }],
    });
    await replay(ctx.adapter, ctx.engine, upThenDown());
    const skipped = ctx.store.signals.filter((s) => !s.taken);
    expect(skipped[0]?.skipReason).toMatch(/Max open positions/);
  });

  it('one failing market does not stop another', async () => {
    const broken = new FakeAdapter();
    broken.failPrice = true;
    Object.defineProperty(broken, 'id', { value: 'us' });
    const engine = new BotEngine(
      new Map<MarketId, MarketAdapter>([
        ['crypto', ctx.adapter],
        ['us', broken as unknown as MarketAdapter],
      ]),
      ctx.store,
      { maxTickJumpPct: 10, sleep: async () => {}, rng: () => 0.99 },
    );
    await replay(ctx.adapter, engine, upThenDown());
    await engine.tickMarket('us');
    expect((await engine.status()).markets.us.status).toBe('error');
    expect(ctx.store.trades.filter((t) => t.market === 'crypto')).toHaveLength(2);
  });
});

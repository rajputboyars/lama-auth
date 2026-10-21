import bcrypt from 'bcryptjs';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { MarketAdapter } from '../src/adapters/types.js';
import { createApp } from '../src/api/app.js';
import { BotEngine } from '../src/bot/engine.js';
import {
  applySettingsPatch,
  defaultSettings,
  withSettingDefaults,
} from '../src/services/settings.js';
import { MemoryStore } from '../src/store/memoryStore.js';
import type { TradeRecord } from '../src/store/types.js';
import { autoPilot } from '../src/strategies/autoPilot.js';
import { detectRegime, efficiencyRatio } from '../src/strategies/regime.js';
import { yourPick } from '../src/strategies/yourPick.js';
import type { MarketId } from '../src/types.js';
import { FakeAdapter, candlesFromCloses, upThenDown } from './helpers.js';

const rising = (n = 100) => Array.from({ length: n }, (_, i) => 100 + i * 0.5 + (i % 2) * 0.1);
const falling = (n = 100) => Array.from({ length: n }, (_, i) => 200 - i * 0.5 - (i % 2) * 0.1);
const wave = (n: number, amp: number, start = 0) =>
  Array.from({ length: n }, (_, i) => 100 + amp * Math.sin(((i + start) * Math.PI) / 5));

describe('detectRegime', () => {
  it('needs enough candles', () => {
    expect(detectRegime(candlesFromCloses(rising(30))).mood).toBe('unclear');
  });

  it('spots up and down trends', () => {
    expect(detectRegime(candlesFromCloses(rising())).mood).toBe('uptrend');
    expect(detectRegime(candlesFromCloses(falling())).mood).toBe('downtrend');
  });

  it('calls a steady back-and-forth market sideways', () => {
    expect(detectRegime(candlesFromCloses(wave(100, 3))).mood).toBe('sideways');
  });

  it('spots a squeeze when prices go unusually quiet', () => {
    const closes = [...wave(80, 3), ...wave(30, 0.2, 80)];
    expect(detectRegime(candlesFromCloses(closes)).mood).toBe('squeeze');
  });

  it('efficiency ratio is 1 for a straight line and low for a zig-zag', () => {
    expect(efficiencyRatio([1, 2, 3, 4, 5], 4)).toBe(1);
    expect(efficiencyRatio([1, 2, 1, 2, 1], 4)).toBe(0);
  });
});

describe('Bot Auto-Pilot', () => {
  it('stays out of a downtrend and says why', () => {
    const sig = autoPilot.check(candlesFromCloses(falling()), null);
    expect(sig.action).toBe('wait');
    expect(sig.meta).toEqual({ mood: 'downtrend', chosen: 'none' });
  });

  it('hands an uptrend to Trend Rider', () => {
    const sig = autoPilot.check(candlesFromCloses(rising()), null);
    expect(sig.meta?.chosen).toBe('trend');
    expect(sig.reason).toContain('uptrend');
  });

  it('sells a held position as soon as the mood turns into a downtrend', () => {
    const pos = { symbol: 'X', quantity: 1, avgPrice: 150, openedAt: 0 };
    const sig = autoPilot.check(candlesFromCloses(falling()), pos);
    expect(sig.action).toBe('sell');
    expect(sig.reason).toMatch(/downtrend/);
  });

  it('can be backtested', () => {
    expect(autoPilot.backtestable).toBe(true);
    expect(autoPilot.minCandles({})).toBeGreaterThanOrEqual(60);
  });
});

describe('Your Pick', () => {
  it('waits when nothing is picked and delegates when something is', () => {
    const candles = candlesFromCloses(upThenDown().slice(0, 81));
    expect(yourPick.check(candles, null, {}, {}).action).toBe('wait');
    const sig = yourPick.check(candles, null, {}, { userStrategyId: 'trend' });
    expect(sig.reason.startsWith('Trend Rider:')).toBe(true);
    expect(sig.meta).toEqual({ chosen: 'trend' });
  });

  it('ignores picks that are not allowed', () => {
    const candles = candlesFromCloses(rising());
    expect(yourPick.check(candles, null, {}, { userStrategyId: 'auto' }).action).toBe('wait');
    expect(yourPick.check(candles, null, {}, { userStrategyId: 'arbitrage' }).action).toBe('wait');
  });
});

describe('duel settings', () => {
  it('defaults every market to Trend Rider and validates picks', () => {
    const s = defaultSettings();
    expect(s.duel.crypto.userStrategy).toBe('trend');
    const next = applySettingsPatch(s, { duel: { crypto: { userStrategy: 'meanrev' } } });
    expect(next.duel.crypto.userStrategy).toBe('meanrev');
    expect(next.duel.us.userStrategy).toBe('trend');
  });

  it('repairs stored settings with a missing or unknown pick', () => {
    const fixed = withSettingDefaults({ duel: { crypto: { userStrategy: 'bogus' } } } as never);
    expect(fixed.duel.crypto.userStrategy).toBe('trend');
    expect(fixed.duel.india.userStrategy).toBe('trend');
  });
});

function engineSetup() {
  const adapter = new FakeAdapter();
  const store = new MemoryStore();
  for (const id of Object.keys(store.settings.strategies))
    store.settings.strategies[id].enabled = id === 'user' || id === 'auto';
  store.settings.costs.crypto = { ...store.settings.costs.crypto, delayMs: 0, failChance: 0 };
  const adapters = new Map<MarketId, MarketAdapter>([['crypto', adapter]]);
  const engine = new BotEngine(adapters, store, {
    maxTickJumpPct: 10,
    sleep: async () => {},
    rng: () => 0.99,
  });
  return { adapter, store, engine, adapters };
}

async function replay(adapter: FakeAdapter, engine: BotEngine, closes: number[]) {
  const all = candlesFromCloses(closes);
  for (let i = 1; i <= all.length; i++) {
    adapter.candles = all.slice(0, i);
    adapter.prices['BTC/USDT'] = all[i - 1].close;
    await engine.tickMarket('crypto');
  }
}

describe('engine with You vs Bot', () => {
  it('runs both duel wallets, records the mood and keeps equity history', async () => {
    const { adapter, store, engine } = engineSetup();
    const trades: TradeRecord[] = [];
    engine.on('trade:new', (t) => trades.push(t));
    await replay(adapter, engine, upThenDown());

    expect(await store.getWallet('crypto', 'user')).not.toBeNull();
    expect(await store.getWallet('crypto', 'auto')).not.toBeNull();
    // The user's default pick (Trend Rider) trades the up-then-down cycle.
    expect(trades.filter((t) => t.strategy === 'user').map((t) => t.side)).toEqual(['buy', 'sell']);
    expect(engine.moodsFor('crypto')['BTC/USDT']?.mood).toBeDefined();
    expect(engine.equitySamples('crypto', 'user').length).toBe(upThenDown().length);
  });
});

describe('duel and chart API', () => {
  const SECRET = 'y'.repeat(40);
  function build() {
    const { adapter, store, engine, adapters } = engineSetup();
    const app = createApp({
      store,
      engine,
      game: { record: async () => {} } as never,
      adapters,
      auth: { jwtSecret: SECRET, username: 'admin', passwordHash: bcrypt.hashSync('pw-123456', 4) },
      clientOrigin: 'http://localhost:5173',
    });
    return { app, adapter, store, engine };
  }
  async function token(app: ReturnType<typeof build>['app']) {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'pw-123456' });
    return { Authorization: `Bearer ${res.body.token}` };
  }

  it('reports both sides, changes the pick and resets the match', async () => {
    const ctx = build();
    const auth = await token(ctx.app);
    await replay(ctx.adapter, ctx.engine, upThenDown());

    const duel = await request(ctx.app).get('/api/duel').set(auth);
    expect(duel.status).toBe(200);
    const crypto = duel.body.find((d: { market: string }) => d.market === 'crypto');
    expect(crypto.userStrategy).toBe('trend');
    expect(crypto.you.strategy).toBe('user');
    expect(crypto.bot.strategy).toBe('auto');
    expect(crypto.history.you.length).toBeGreaterThan(0);

    const bad = await request(ctx.app)
      .put('/api/duel/crypto')
      .set(auth)
      .send({ userStrategy: 'auto' });
    expect(bad.status).toBe(400);
    const ok = await request(ctx.app)
      .put('/api/duel/crypto')
      .set(auth)
      .send({ userStrategy: 'breakout' });
    expect(ok.body.userStrategy).toBe('breakout');
    expect((await ctx.store.getSettings()).duel.crypto.userStrategy).toBe('breakout');

    const reset = await request(ctx.app).post('/api/duel/crypto/reset').set(auth);
    expect(reset.status).toBe(200);
    expect(ctx.engine.equitySamples('crypto', 'user')).toHaveLength(0);
    const w = await ctx.store.getWallet('crypto', 'user');
    expect(w?.cash ?? 10_000).toBe(10_000);
  });

  it('blocks a reset while the bot is running', async () => {
    const ctx = build();
    const auth = await token(ctx.app);
    await ctx.engine.start();
    const res = await request(ctx.app).post('/api/duel/crypto/reset').set(auth);
    await ctx.engine.stop();
    expect(res.status).toBe(409);
  });

  it('serves chart candles from the adapter', async () => {
    const ctx = build();
    const auth = await token(ctx.app);
    ctx.adapter.candles = candlesFromCloses(rising(50));
    const res = await request(ctx.app)
      .get('/api/chart/crypto/BTC%2FUSDT?interval=1m&limit=20')
      .set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(20);
    expect(res.body[0]).toHaveProperty('open');
  });
});

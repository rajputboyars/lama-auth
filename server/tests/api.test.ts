import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import type { MarketAdapter } from '../src/adapters/types.js';
import { createApp } from '../src/api/app.js';
import { BotEngine } from '../src/bot/engine.js';
import type { GameEvent } from '../src/game/rules.js';
import { MemoryStore } from '../src/store/memoryStore.js';
import type { MarketId } from '../src/types.js';
import { FakeAdapter, candlesFromCloses, upThenDown } from './helpers.js';

const SECRET = 'x'.repeat(40);

function build() {
  const store = new MemoryStore();
  const adapter = new FakeAdapter();
  const adapters = new Map<MarketId, MarketAdapter>([['crypto', adapter]]);
  const engine = new BotEngine(adapters, store, { maxTickJumpPct: 10, sleep: async () => {} });
  const events: GameEvent[] = [];
  const game = {
    record: async (e: GameEvent) => void events.push(e),
    profile: async () => ({ level: 1, xp: 0 }),
    achievements: async () => [],
    quests: async () => [],
  };
  const app = createApp({
    store,
    engine,
    game: game as never,
    adapters,
    auth: { jwtSecret: SECRET, username: 'admin', passwordHash: bcrypt.hashSync('correct-horse', 4) },
    clientOrigin: 'http://localhost:5173',
  });
  return { app, store, engine, events };
}

describe('API', () => {
  let ctx: ReturnType<typeof build>;
  let token: string;

  beforeAll(async () => {
    ctx = build();
    const res = await request(ctx.app).post('/api/auth/login').send({ username: 'admin', password: 'correct-horse' });
    expect(res.status).toBe(200);
    token = res.body.token;
  });
  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('rejects bad logins and unauthenticated requests', async () => {
    const bad = await request(ctx.app).post('/api/auth/login').send({ username: 'admin', password: 'nope' });
    expect(bad.status).toBe(401);
    expect((await request(ctx.app).get('/api/stats')).status).toBe(401);
    expect((await request(ctx.app).get('/api/stats').set('Authorization', 'Bearer junk')).status).toBe(401);
  });

  it('validates query input', async () => {
    const res = await request(ctx.app).get('/api/trades?market=mars').set(auth());
    expect(res.status).toBe(400);
  });

  it('GET/PUT settings with validation', async () => {
    const put = await request(ctx.app).put('/api/settings').set(auth()).send({ risk: { dailyLossLimitPct: 2 } });
    expect(put.status).toBe(200);
    expect(put.body.risk.dailyLossLimitPct).toBe(2);
    expect((await request(ctx.app).put('/api/settings').set(auth()).send({ risk: { dailyLossLimitPct: -1 } })).status).toBe(400);
  });

  it('runs a backtest on stored candles and records the game event', async () => {
    const candles = candlesFromCloses([...upThenDown(), ...upThenDown()]);
    await ctx.store.saveCandles('crypto', 'BTC/USDT', '1h', candles);
    const res = await request(ctx.app)
      .post('/api/backtest')
      .set(auth())
      .send({ strategy: 'trend', market: 'crypto', symbol: 'BTC/USDT', interval: '1h', from: 0, to: Date.now() });
    expect(res.status).toBe(200);
    expect(res.body.stats.trades).toBeGreaterThan(0);
    expect(res.body.notes.length).toBeGreaterThan(0);
    expect(ctx.events).toContainEqual({ type: 'backtest_run', market: 'crypto', strategy: 'trend' });
  });

  it('refuses to backtest arbitrage', async () => {
    const res = await request(ctx.app)
      .post('/api/backtest')
      .set(auth())
      .send({ strategy: 'arbitrage', market: 'crypto', symbol: 'BTC/USDT', from: 0, to: 1 });
    expect(res.status).toBe(400);
  });

  it('only lets you review losing trades, once', async () => {
    const win = await ctx.store.insertTrade({ ...tradeBase, pnl: 5 });
    const loss = await ctx.store.insertTrade({ ...tradeBase, pnl: -5 });
    const note = { note: 'Entered against the trend, ignored my own rule.' };
    expect((await request(ctx.app).post(`/api/trades/${win.id}/review`).set(auth()).send(note)).status).toBe(400);
    expect((await request(ctx.app).post(`/api/trades/${loss.id}/review`).set(auth()).send(note)).status).toBe(200);
    expect((await request(ctx.app).post(`/api/trades/${loss.id}/review`).set(auth()).send(note)).status).toBe(409);
    expect(ctx.events).toContainEqual({ type: 'losing_trade_reviewed' });
  });

  it('start/stop the bot; wallet reset is refused while running; kill switch blocks start', async () => {
    expect((await request(ctx.app).post('/api/bot/start').set(auth())).body.running).toBe(true);
    expect((await request(ctx.app).post('/api/wallets/reset').set(auth()).send({})).status).toBe(409);
    expect((await request(ctx.app).post('/api/bot/stop').set(auth())).body.running).toBe(false);
    expect((await request(ctx.app).post('/api/wallets/reset').set(auth()).send({})).status).toBe(200);
    await request(ctx.app).put('/api/settings').set(auth()).send({ risk: { killSwitch: true } });
    expect((await request(ctx.app).post('/api/bot/start').set(auth())).status).toBe(409);
  });

  it('returns stats, markets and game data', async () => {
    for (const p of ['/api/stats', '/api/wallets', '/api/signals', '/api/markets', '/api/strategies', '/api/game/profile', '/api/game/quests', '/api/game/achievements']) {
      expect((await request(ctx.app).get(p).set(auth())).status, p).toBe(200);
    }
    const c = await request(ctx.app).get(`/api/candles/crypto/${encodeURIComponent('BTC/USDT')}?interval=1h&limit=5`).set(auth());
    expect(c.body).toHaveLength(5);
  });
});

const tradeBase = {
  market: 'crypto' as const,
  strategy: 'trend',
  symbol: 'BTC/USDT',
  currency: 'USD' as const,
  side: 'sell' as const,
  status: 'filled' as const,
  quantity: 1,
  refPrice: 100,
  fillPrice: 100,
  fees: 0.1,
  taxes: 0,
  spreadCost: 0,
  slippageCost: 0,
  pnl: 0,
  reason: 'test',
  time: 1,
};

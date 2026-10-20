import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import mongoose from 'mongoose';
import { createAdapters } from './adapters/index.js';
import { createApp } from './api/app.js';
import { BotEngine } from './bot/engine.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { GameService } from './game/gameService.js';
import { attachSocket } from './socket/index.js';
import { STRATEGIES } from './strategies/index.js';
import { MongoStore } from './store/mongoStore.js';
import type { TradeRecord } from './store/types.js';

const DAY_CHECK_MS = 60 * 60_000;

function resolveJwtSecret(): string {
  if (env.JWT_SECRET) return env.JWT_SECRET;
  if (env.NODE_ENV === 'production') throw new Error('JWT_SECRET is required in production');
  logger.warn('JWT_SECRET not set: using a random secret (logins reset on restart)');
  return randomBytes(48).toString('hex');
}

async function main() {
  const jwtSecret = resolveJwtSecret();
  if (!env.ADMIN_PASSWORD_HASH) logger.warn('ADMIN_PASSWORD_HASH not set: login is disabled until you set it');

  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10_000 });
  logger.info('connected to MongoDB');

  const store = new MongoStore();
  const adapters = createAdapters(env);
  const engine = new BotEngine(adapters, store, { maxTickJumpPct: env.MAX_TICK_JUMP_PCT });
  const game = new GameService();

  // Game hooks: only discipline signals, never profit.
  engine.on('trade:new', (t: TradeRecord) => {
    if (t.status === 'filled') void game.record({ type: 'trade_logged' }).catch((e) => logger.warn({ e: String(e) }, 'game'));
  });
  engine.on('risk:breach', () => void game.record({ type: 'risk_breach' }).catch((e) => logger.warn({ e: String(e) }, 'game')));
  for (const s of STRATEGIES) await game.record({ type: 'strategy_added', strategy: s.id });

  const dayTimer = setInterval(async () => {
    if (!engine.isRunning()) return;
    try {
      await game.closeDayIfNeeded(await store.listWallets());
    } catch (err) {
      logger.warn({ err: String(err) }, 'daily game check failed');
    }
  }, DAY_CHECK_MS);

  const app = createApp({
    store,
    engine,
    game,
    adapters,
    auth: { jwtSecret, username: env.ADMIN_USERNAME, passwordHash: env.ADMIN_PASSWORD_HASH },
    clientOrigin: env.CLIENT_ORIGIN,
  });
  const http = createServer(app);
  const io = attachSocket(http, engine, game, jwtSecret, env.CLIENT_ORIGIN);
  http.listen(env.PORT, () => logger.info({ port: env.PORT }, 'API listening — PAPER TRADING ONLY'));

  const settings = await store.getSettings();
  if (settings.botRunning && !settings.risk.killSwitch) await engine.start();

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    clearInterval(dayTimer);
    const wasRunning = engine.isRunning();
    await engine.stop();
    // Remember that the bot was running so it resumes after a restart.
    if (wasRunning) await store.saveSettings({ ...(await store.getSettings()), botRunning: true });
    io.close();
    await new Promise<void>((r) => http.close(() => r()));
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.fatal({ err: err instanceof Error ? err.stack : String(err) }, 'startup failed');
  process.exit(1);
});

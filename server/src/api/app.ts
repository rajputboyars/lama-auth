import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';
import type { MarketAdapter } from '../adapters/types.js';
import type { BotEngine } from '../bot/engine.js';
import type { GameService } from '../game/gameService.js';
import { STRATEGIES, getStrategy } from '../strategies/index.js';
import { runBacktest } from '../services/backtester.js';
import { leaderboard, summarize } from '../services/portfolio.js';
import { cleanCandles } from '../services/dataGuard.js';
import { DuelPickSchema, SettingsPatchSchema, applySettingsPatch } from '../services/settings.js';
import type { Store, TradeRecord } from '../store/types.js';
import type { Candle } from '../types.js';
import { MARKET_IDS, type MarketId } from '../types.js';
import { type AuthConfig, login, requireAuth } from './auth.js';
import { HttpError, ah, errorHandler, parse } from './http.js';

export interface AppDeps {
  store: Store;
  engine: BotEngine;
  game: Pick<GameService, 'record' | 'profile' | 'achievements' | 'quests'>;
  adapters: Map<MarketId, MarketAdapter>;
  auth: AuthConfig;
  clientOrigin: string;
  /** Same bad-tick filter the engine uses, applied to chart candles. */
  maxTickJumpPct?: number;
}

/** You vs Bot wallets: the user's pick and the bot's Auto-Pilot. */
const DUEL_STRATEGIES = ['user', 'auto'];
const CHART_CACHE_MS = 15_000;

const Market = z.enum(MARKET_IDS as [MarketId, ...MarketId[]]);
const Page = z.coerce.number().int().min(1).max(10_000).default(1);
const PageSize = z.coerce.number().int().min(1).max(200).default(50);
const Interval = z.enum(['1m', '5m', '15m', '1h', '1d']);

const TradesQuery = z.object({
  market: Market.optional(),
  strategy: z.string().max(40).optional(),
  status: z.enum(['filled', 'failed']).optional(),
  page: Page,
  pageSize: PageSize,
});

const SignalsQuery = z.object({
  market: Market.optional(),
  strategy: z.string().max(40).optional(),
  taken: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: Page,
  pageSize: PageSize,
});

const CandlesQuery = z.object({
  interval: Interval.default('1m'),
  limit: z.coerce.number().int().min(1).max(5000).default(300),
  from: z.coerce.number().int().min(0).optional(),
  to: z.coerce.number().int().min(0).optional(),
});

export const BacktestSchema = z
  .object({
    strategy: z.string().max(40),
    market: Market,
    symbol: z.string().min(1).max(40),
    interval: Interval.default('1h'),
    from: z.coerce.number().int().min(0),
    to: z.coerce.number().int().min(0),
    params: z.record(z.string(), z.number().finite()).optional(),
    startingCash: z.number().positive().max(1e12).optional(),
    seed: z.number().int().optional(),
  })
  .refine((b) => b.to > b.from, { message: '`to` must be after `from`' });

const ChartQuery = z.object({
  interval: Interval.default('1m'),
  limit: z.coerce.number().int().min(10).max(1000).default(300),
});

const ResetSchema = z.object({
  market: Market.optional(),
  strategy: z.string().max(40).optional(),
});
const ReviewSchema = z.object({
  note: z.string().trim().min(10, 'Write at least a sentence').max(2000),
});

export function createApp(deps: AppDeps) {
  const { store, engine, game, adapters } = deps;
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: deps.clientOrigin }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, paperTradingOnly: true }));

  app.post(
    '/api/auth/login',
    rateLimit({ windowMs: 60_000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false }),
    ah(async (req, res) => res.json({ token: await login(deps.auth, req.body) })),
  );

  const api = express.Router();
  api.use(
    rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }),
  );
  api.use(requireAuth(deps.auth.jwtSecret));

  api.get(
    '/stats',
    ah(async (_req, res) => {
      const [wallets, trades] = await Promise.all([
        store.listWallets(),
        store.listTrades({ status: 'filled', page: 1, pageSize: 5000 }),
      ]);
      const summary = summarize(wallets, trades.items, engine.latestPrices());
      res.json({
        ...summary,
        leaderboard: leaderboard(summary.strategies),
        status: await engine.status(),
      });
    }),
  );

  api.get(
    '/wallets',
    ah(async (_req, res) => {
      const prices = engine.latestPrices();
      const wallets = await store.listWallets();
      res.json(
        summarize(wallets, [], prices).strategies.map((s, i) => ({
          ...wallets[i],
          equity: s.equity,
        })),
      );
    }),
  );

  api.post(
    '/wallets/reset',
    ah(async (req, res) => {
      if (engine.isRunning()) throw new HttpError(409, 'Stop the bot before resetting wallets');
      const n = await store.resetWallets(parse(ResetSchema, req.body ?? {}));
      res.json({ reset: n });
    }),
  );

  api.get(
    '/trades',
    ah(async (req, res) => res.json(await store.listTrades(parse(TradesQuery, req.query)))),
  );

  api.post(
    '/trades/:id/review',
    ah(async (req, res) => {
      const { note } = parse(ReviewSchema, req.body);
      const trade = await store.getTrade(String(req.params.id));
      if (!trade) throw new HttpError(404, 'Trade not found');
      if (trade.status !== 'filled' || trade.pnl >= 0)
        throw new HttpError(400, 'Only losing trades can be reviewed');
      if (trade.review) throw new HttpError(409, 'Trade already reviewed');
      const updated = await store.reviewTrade(trade.id!, note, Date.now());
      await game.record({ type: 'losing_trade_reviewed' });
      res.json(updated);
    }),
  );

  api.get(
    '/signals',
    ah(async (req, res) => res.json(await store.listSignals(parse(SignalsQuery, req.query)))),
  );

  api.get(
    '/candles/:market/:symbol',
    ah(async (req, res) => {
      const market = parse(Market, req.params.market);
      const q = parse(CandlesQuery, req.query);
      res.json(
        await store.getCandles(
          market,
          String(req.params.symbol),
          q.interval,
          q.from,
          q.to,
          q.limit,
        ),
      );
    }),
  );

  api.get(
    '/markets',
    ah(async (_req, res) => {
      const settings = await store.getSettings();
      const status = await engine.status();
      const rows = await Promise.all(
        [...adapters.values()].map(async (a) => ({
          id: a.id,
          name: a.name,
          currency: a.currency,
          open: a.isOpen(),
          enabled: settings.markets[a.id]?.enabled ?? false,
          symbols: await a.listSymbols(),
          state: status.markets[a.id],
        })),
      );
      res.json(rows);
    }),
  );

  api.get('/strategies', (_req, res) =>
    res.json(
      STRATEGIES.map(({ id, name, description, markets, params, backtestable }) => ({
        id,
        name,
        description,
        markets,
        params,
        backtestable,
      })),
    ),
  );

  api.get(
    '/settings',
    ah(async (_req, res) => res.json(await store.getSettings())),
  );

  api.put(
    '/settings',
    ah(async (req, res) => {
      const patch = parse(SettingsPatchSchema, req.body);
      let next;
      try {
        next = applySettingsPatch(await store.getSettings(), patch);
      } catch (err) {
        throw new HttpError(400, err instanceof Error ? err.message : 'Invalid settings');
      }
      await store.saveSettings(next);
      res.json(next);
    }),
  );

  api.post(
    '/bot/start',
    ah(async (_req, res) => {
      const s = await store.getSettings();
      if (s.risk.killSwitch)
        throw new HttpError(409, 'Kill switch is ON. Turn it off in Settings first.');
      await engine.start();
      res.json(await engine.status());
    }),
  );

  api.post(
    '/bot/stop',
    ah(async (_req, res) => {
      await engine.stop();
      res.json(await engine.status());
    }),
  );

  api.get(
    '/bot/status',
    ah(async (_req, res) => res.json(await engine.status())),
  );

  api.post(
    '/backtest',
    ah(async (req, res) => {
      const b = parse(BacktestSchema, req.body);
      const strategy = getStrategy(b.strategy);
      if (!strategy) throw new HttpError(400, `Unknown strategy: ${b.strategy}`);
      if (!strategy.backtestable)
        throw new HttpError(
          400,
          `${strategy.name} needs multi-exchange history and cannot be backtested`,
        );
      if (strategy.markets !== 'all' && !strategy.markets.includes(b.market)) {
        throw new HttpError(400, `${strategy.name} does not trade the ${b.market} market`);
      }
      const settings = await store.getSettings();
      const currency = adapters.get(b.market)?.currency ?? (b.market === 'india' ? 'INR' : 'USD');

      let candles = await store.getCandles(b.market, b.symbol, b.interval, b.from, b.to, 20_000);
      let source = 'stored candles';
      const adapter = adapters.get(b.market);
      if (candles.length < 100 && adapter) {
        try {
          const fetched = await adapter.getCandles(b.symbol, b.interval, 1000);
          await store.saveCandles(b.market, b.symbol, b.interval, fetched);
          candles = fetched.filter((c) => c.time >= b.from && c.time <= b.to);
          source = `${adapter.name} (fetched latest ${fetched.length})`;
        } catch (err) {
          throw new HttpError(502, `Not enough stored candles and fetching failed: ${String(err)}`);
        }
      }

      let result;
      try {
        result = runBacktest({
          market: b.market,
          symbol: b.symbol,
          currency,
          candles,
          strategy,
          params: { ...settings.strategies[strategy.id]?.params, ...b.params },
          costs: settings.costs[b.market],
          risk: { ...settings.risk, killSwitch: false },
          startingCash: b.startingCash,
          seed: b.seed,
        });
      } catch (err) {
        throw new HttpError(400, err instanceof Error ? err.message : 'Backtest failed');
      }
      await game.record({ type: 'backtest_run', market: b.market, strategy: strategy.id });
      res.json({ ...result, source, candles: candles.length, currency });
    }),
  );

  // ---- Live charts ----
  const chartCache = new Map<string, { at: number; candles: Candle[] }>();
  api.get(
    '/chart/:market/:symbol',
    ah(async (req, res) => {
      const market = parse(Market, req.params.market);
      const symbol = String(req.params.symbol);
      const q = parse(ChartQuery, req.query);
      const key = `${market}:${symbol}:${q.interval}:${q.limit}`;
      const hit = chartCache.get(key);
      if (hit && Date.now() - hit.at < CHART_CACHE_MS) return void res.json(hit.candles);

      const adapter = adapters.get(market);
      let candles: Candle[];
      try {
        if (!adapter) throw new Error('market not configured');
        const raw = await adapter.getCandles(symbol, q.interval, q.limit);
        candles = cleanCandles(raw, deps.maxTickJumpPct ?? 10);
      } catch (err) {
        candles = await store.getCandles(market, symbol, q.interval, undefined, undefined, q.limit);
        if (candles.length === 0)
          throw new HttpError(502, `Could not load candles for ${symbol}: ${String(err)}`);
      }
      chartCache.set(key, { at: Date.now(), candles });
      res.json(candles);
    }),
  );

  // ---- You vs Bot ----
  api.get(
    '/duel',
    ah(async (_req, res) => {
      const settings = await store.getSettings();
      const wallets = (await store.listWallets()).filter((w) =>
        DUEL_STRATEGIES.includes(w.strategy),
      );
      const trades: TradeRecord[] = [];
      for (const strategy of DUEL_STRATEGIES)
        trades.push(
          ...(await store.listTrades({ strategy, status: 'filled', page: 1, pageSize: 5000 }))
            .items,
        );
      const rows = summarize(wallets, trades, engine.latestPrices()).strategies;
      const row = (m: MarketId, s: string) =>
        rows.find((r) => r.market === m && r.strategy === s) ?? null;
      res.json(
        [...adapters.values()].map((a) => ({
          market: a.id,
          name: a.name,
          currency: a.currency,
          open: a.isOpen(),
          enabled: settings.markets[a.id]?.enabled ?? false,
          userStrategy: settings.duel[a.id].userStrategy,
          you: row(a.id, 'user'),
          bot: row(a.id, 'auto'),
          moods: engine.moodsFor(a.id),
          history: {
            you: engine.equitySamples(a.id, 'user'),
            bot: engine.equitySamples(a.id, 'auto'),
          },
        })),
      );
    }),
  );

  api.put(
    '/duel/:market',
    ah(async (req, res) => {
      const market = parse(Market, req.params.market);
      const pick = parse(DuelPickSchema, req.body);
      const next = applySettingsPatch(await store.getSettings(), { duel: { [market]: pick } });
      await store.saveSettings(next);
      res.json({ market, userStrategy: next.duel[market].userStrategy });
    }),
  );

  api.post(
    '/duel/:market/reset',
    ah(async (req, res) => {
      const market = parse(Market, req.params.market);
      if (engine.isRunning()) throw new HttpError(409, 'Stop the bot before resetting the match');
      let n = 0;
      for (const strategy of DUEL_STRATEGIES) n += await store.resetWallets({ market, strategy });
      engine.clearEquitySamples(market, DUEL_STRATEGIES);
      res.json({ reset: n });
    }),
  );

  api.get(
    '/game/profile',
    ah(async (_req, res) => res.json(await game.profile())),
  );
  api.get(
    '/game/achievements',
    ah(async (_req, res) => res.json(await game.achievements())),
  );
  api.get(
    '/game/quests',
    ah(async (_req, res) => res.json(await game.quests())),
  );

  app.use('/api', api);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
}

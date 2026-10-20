/**
 * Seeds DEMO data so the dashboard has something to show on first run.
 * Candles are a synthetic random walk (not real prices) and trades come from running the
 * real backtester over them, so every demo trade still pays full costs.
 *
 *   npm run seed            # refuses if data exists
 *   npm run seed -- --reset # wipes trading + game collections first
 */
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import {
  AchievementModel,
  CandleModel,
  PlayerProfileModel,
  QuestModel,
  SignalModel,
  TradeModel,
  WalletModel,
} from '../models/index.js';
import { STRATEGIES } from '../strategies/index.js';
import { mulberry32, runBacktest } from '../services/backtester.js';
import { DEFAULT_STARTING_CASH } from '../services/paperWallet.js';
import { MongoStore } from '../store/mongoStore.js';
import type { Candle, Currency, MarketId } from '../types.js';

const HOUR = 3_600_000;
const DEMO: { market: MarketId; symbol: string; currency: Currency; start: number }[] = [
  { market: 'crypto', symbol: 'BTC/USDT', currency: 'USD', start: 60_000 },
  { market: 'us', symbol: 'AAPL', currency: 'USD', start: 190 },
  { market: 'india', symbol: 'RELIANCE', currency: 'INR', start: 2900 },
  { market: 'global', symbol: 'GC=F', currency: 'USD', start: 2400 },
];

export function randomWalk(start: number, count: number, seed: number, endTime = Date.now()): Candle[] {
  const rng = mulberry32(seed);
  const out: Candle[] = [];
  let price = start;
  let drift = 0;
  for (let i = 0; i < count; i++) {
    drift = drift * 0.98 + (rng() - 0.5) * 0.0008; // slowly changing regime
    const open = price;
    const close = open * (1 + drift + (rng() - 0.5) * 0.012);
    const high = Math.max(open, close) * (1 + rng() * 0.004);
    const low = Math.min(open, close) * (1 - rng() * 0.004);
    out.push({ time: endTime - (count - i) * HOUR, open, high, low, close, volume: Math.round(rng() * 1000) });
    price = close;
  }
  return out;
}

async function main() {
  const reset = process.argv.includes('--reset');
  await mongoose.connect(env.MONGO_URI);
  const models = [WalletModel, TradeModel, SignalModel, CandleModel, PlayerProfileModel, AchievementModel, QuestModel];
  if (reset) {
    await Promise.all(models.map((m) => (m as typeof WalletModel).deleteMany({})));
  } else if ((await WalletModel.countDocuments()) > 0) {
    console.error('Data already exists. Re-run with --reset to wipe it and seed demo data.');
    process.exit(1);
  }

  const store = new MongoStore();
  const settings = await store.getSettings();

  for (const [i, d] of DEMO.entries()) {
    const candles = randomWalk(d.start, 1200, 1000 + i);
    await store.saveCandles(d.market, d.symbol, '1h', candles);

    for (const strategy of STRATEGIES.filter((s) => s.backtestable)) {
      const result = runBacktest({
        market: d.market,
        symbol: d.symbol,
        currency: d.currency,
        candles,
        strategy,
        params: settings.strategies[strategy.id]?.params,
        costs: settings.costs[d.market],
        risk: settings.risk,
        startingCash: DEFAULT_STARTING_CASH[d.currency],
        seed: 7 + i,
      });

      let cash = DEFAULT_STARTING_CASH[d.currency];
      let fees = 0;
      let taxes = 0;
      let qty = 0;
      let avg = 0;
      for (const t of result.trades) {
        const value = t.price * t.quantity;
        if (t.side === 'buy') {
          avg = (avg * qty + value + t.fees + t.taxes) / (qty + t.quantity);
          qty += t.quantity;
          cash -= value + t.fees + t.taxes;
        } else {
          qty = 0;
          cash += value - t.fees - t.taxes;
        }
        fees += t.fees;
        taxes += t.taxes;
        await store.insertTrade({
          market: d.market,
          strategy: strategy.id,
          symbol: d.symbol,
          currency: d.currency,
          side: t.side,
          status: 'filled',
          quantity: t.quantity,
          refPrice: t.price,
          fillPrice: t.price,
          fees: t.fees,
          taxes: t.taxes,
          spreadCost: 0,
          slippageCost: 0,
          pnl: t.pnl,
          reason: `[DEMO data] ${t.reason}`,
          time: t.time,
        });
      }
      const last = candles.at(-1)!;
      await store.saveWallet({
        market: d.market,
        strategy: strategy.id,
        currency: d.currency,
        startingCash: DEFAULT_STARTING_CASH[d.currency],
        cash,
        positions: qty > 0 ? [{ symbol: d.symbol, quantity: qty, avgPrice: avg, openedAt: last.time }] : [],
        realizedPnl: result.trades.reduce((a, t) => a + t.pnl, 0),
        feesPaid: fees,
        taxesPaid: taxes,
        peakEquity: Math.max(...result.equityCurve.map((p) => p.equity)),
        maxDrawdownPct: result.stats.maxDrawdownPct,
        createdAt: candles[0].time,
      });
      console.log(
        `${d.market.padEnd(6)} ${strategy.id.padEnd(9)} trades=${String(result.trades.length).padStart(3)} return=${result.stats.totalReturnPct.toFixed(2)}%`,
      );
    }
  }
  console.log('Demo data seeded. Prices are a synthetic random walk, not real market data.');
  await mongoose.disconnect();
}

if (process.argv[1]?.includes('seed')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

import type { Strategy } from '../strategies/types.js';
import type { Params } from '../strategies/types.js';
import type { Candle, Currency, MarketId, Side } from '../types.js';
import { type CostConfig, estimateCosts, rollFailure } from './costModel.js';
import {
  applyBuy,
  applySell,
  createWallet,
  equity,
  findPosition,
  type WalletState,
} from './paperWallet.js';
import { type RiskConfig, evaluate } from './riskManager.js';
import { type EquityPoint, type PerformanceStats, computeStats } from './stats.js';

/** Same lookback the live engine feeds strategies, so backtests and live see identical windows. */
export const CANDLE_WINDOW = 200;

export interface BacktestInput {
  market: MarketId;
  symbol: string;
  currency: Currency;
  candles: Candle[];
  strategy: Strategy;
  params?: Params;
  costs: CostConfig;
  risk: RiskConfig;
  startingCash?: number;
  seed?: number;
}

export interface BacktestTrade {
  time: number;
  side: Side;
  price: number;
  quantity: number;
  fees: number;
  taxes: number;
  pnl: number;
  reason: string;
}

export interface BacktestResult {
  stats: PerformanceStats;
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
  failedOrders: number;
  blockedSignals: number;
  openPosition: { quantity: number; avgPrice: number } | null;
  notes: string[];
}

/** Small deterministic PRNG so a backtest with the same seed always gives the same result. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function runBacktest(input: BacktestInput): BacktestResult {
  const { strategy, candles, costs, risk, symbol } = input;
  if (!strategy.backtestable)
    throw new Error(`${strategy.name} cannot be backtested from single-venue candles`);
  const minNeeded = strategy.minCandles(input.params ?? {});
  if (candles.length < minNeeded + 2)
    throw new Error(`Need at least ${minNeeded + 2} candles, got ${candles.length}`);

  const rng = mulberry32(input.seed ?? 42);
  let wallet: WalletState = createWallet(
    input.market,
    strategy.id,
    input.currency,
    input.startingCash,
    candles[0].time,
  );
  const trades: BacktestTrade[] = [];
  const equityCurve: EquityPoint[] = [];
  let failedOrders = 0;
  let blockedSignals = 0;
  let currentDay = '';
  let dayStartEquity = wallet.cash;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const eqNow = equity(wallet, { [symbol]: c.close });
    if (dayKey(c.time) !== currentDay) {
      currentDay = dayKey(c.time);
      dayStartEquity = eqNow;
    }
    equityCurve.push({ time: c.time, equity: eqNow });

    const next = candles[i + 1];
    if (i + 1 < minNeeded || !next) continue;

    const window = candles.slice(Math.max(0, i + 1 - CANDLE_WINDOW), i + 1);
    const position = findPosition(wallet, symbol);
    const signal = strategy.check(window, position, input.params);
    if (signal.action === 'wait') continue;

    const decision = evaluate(
      {
        action: signal.action,
        price: next.open,
        equity: eqNow,
        cash: wallet.cash,
        openPositions: wallet.positions.length,
        heldQuantity: position?.quantity ?? 0,
        dayStartEquity,
      },
      risk,
    );
    if (!decision.allowed) {
      blockedSignals++;
      continue;
    }
    if (rollFailure(costs, rng)) {
      failedOrders++;
      continue;
    }

    // Fill at the NEXT candle's open: we never trade at the price that produced the signal.
    const side = signal.action;
    const breakdown = estimateCosts(
      { side, symbol, quantity: decision.quantity, price: next.open },
      costs,
    );
    try {
      const res =
        side === 'buy'
          ? applyBuy(wallet, symbol, decision.quantity, breakdown, next.time)
          : applySell(wallet, symbol, decision.quantity, breakdown);
      wallet = res.wallet;
      trades.push({
        time: next.time,
        side,
        price: breakdown.fillPrice,
        quantity: decision.quantity,
        fees: breakdown.fees,
        taxes: breakdown.taxes,
        pnl: res.pnl,
        reason: signal.reason,
      });
    } catch {
      blockedSignals++; // e.g. costs pushed the buy over available cash
    }
  }

  const closed = trades.filter((t) => t.side === 'sell');
  const startingCash = equityCurve[0].equity;
  const pos = findPosition(wallet, symbol);
  const notes = [
    'Fills use the next candle open plus spread, slippage, fees and taxes.',
    'Past results do not predict future results. Small samples are noise.',
  ];
  if (closed.length < 30)
    notes.push(`Only ${closed.length} closed trades: too few to judge this strategy.`);
  if (pos)
    notes.push('A position is still open; it is valued at the last close, before exit costs.');

  return {
    stats: computeStats(closed, equityCurve, startingCash, wallet.feesPaid + wallet.taxesPaid),
    trades,
    equityCurve,
    failedOrders,
    blockedSignals,
    openPosition: pos ? { quantity: pos.quantity, avgPrice: pos.avgPrice } : null,
    notes,
  };
}

import type { CostBreakdown, Currency, MarketId, Position } from '../types.js';

export interface WalletState {
  market: MarketId;
  strategy: string;
  currency: Currency;
  startingCash: number;
  cash: number;
  positions: Position[];
  realizedPnl: number;
  feesPaid: number;
  taxesPaid: number;
  peakEquity: number;
  maxDrawdownPct: number;
  createdAt: number;
}

export interface FillResult {
  wallet: WalletState;
  /** Realized PnL of this fill after all costs (0 for buys). */
  pnl: number;
}

export const DEFAULT_STARTING_CASH: Record<Currency, number> = { USD: 10_000, INR: 1_000_000 };

const round = (n: number, dp = 8) => Math.round(n * 10 ** dp) / 10 ** dp;

export function createWallet(
  market: MarketId,
  strategy: string,
  currency: Currency,
  startingCash = DEFAULT_STARTING_CASH[currency],
  now = Date.now(),
): WalletState {
  return {
    market,
    strategy,
    currency,
    startingCash,
    cash: startingCash,
    positions: [],
    realizedPnl: 0,
    feesPaid: 0,
    taxesPaid: 0,
    peakEquity: startingCash,
    maxDrawdownPct: 0,
    createdAt: now,
  };
}

export function findPosition(w: WalletState, symbol: string): Position | null {
  return w.positions.find((p) => p.symbol === symbol) ?? null;
}

export function applyBuy(
  w: WalletState,
  symbol: string,
  quantity: number,
  costs: CostBreakdown,
  now = Date.now(),
): FillResult {
  const cashNeeded = costs.notional + costs.total;
  if (cashNeeded > w.cash + 1e-9) {
    throw new Error(`Insufficient paper cash: need ${cashNeeded.toFixed(2)}, have ${w.cash.toFixed(2)}`);
  }
  const existing = findPosition(w, symbol);
  const unitCost = cashNeeded / quantity;
  const positions = existing
    ? w.positions.map((p) =>
        p.symbol === symbol
          ? {
              ...p,
              quantity: round(p.quantity + quantity),
              avgPrice: (p.avgPrice * p.quantity + unitCost * quantity) / (p.quantity + quantity),
            }
          : p,
      )
    : [...w.positions, { symbol, quantity, avgPrice: unitCost, openedAt: now }];

  return {
    wallet: {
      ...w,
      cash: round(w.cash - cashNeeded),
      positions,
      feesPaid: w.feesPaid + costs.fees,
      taxesPaid: w.taxesPaid + costs.taxes,
    },
    pnl: 0,
  };
}

export function applySell(
  w: WalletState,
  symbol: string,
  quantity: number,
  costs: CostBreakdown,
): FillResult {
  const pos = findPosition(w, symbol);
  if (!pos || pos.quantity + 1e-12 < quantity) throw new Error(`Cannot sell ${quantity} ${symbol}: not held`);

  const proceeds = costs.notional - costs.total;
  const pnl = proceeds - pos.avgPrice * quantity;
  const remaining = round(pos.quantity - quantity);
  const positions =
    remaining <= 0
      ? w.positions.filter((p) => p.symbol !== symbol)
      : w.positions.map((p) => (p.symbol === symbol ? { ...p, quantity: remaining } : p));

  return {
    wallet: {
      ...w,
      cash: round(w.cash + proceeds),
      positions,
      realizedPnl: w.realizedPnl + pnl,
      feesPaid: w.feesPaid + costs.fees,
      taxesPaid: w.taxesPaid + costs.taxes,
    },
    pnl,
  };
}

/** Marks positions to market at the given prices (missing prices fall back to cost basis). */
export function equity(w: WalletState, prices: Record<string, number>): number {
  return w.positions.reduce((sum, p) => sum + p.quantity * (prices[p.symbol] ?? p.avgPrice), w.cash);
}

export function updateDrawdown(w: WalletState, currentEquity: number): WalletState {
  const peakEquity = Math.max(w.peakEquity, currentEquity);
  const dd = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;
  return { ...w, peakEquity, maxDrawdownPct: Math.max(w.maxDrawdownPct, dd) };
}

export function resetWallet(w: WalletState, now = Date.now()): WalletState {
  return createWallet(w.market, w.strategy, w.currency, w.startingCash, now);
}

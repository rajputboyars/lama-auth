import type { Candle, CostBreakdown, Currency, MarketId, Quote, TradeIntent } from '../types.js';

export type Interval = '1m' | '5m' | '15m' | '1h' | '1d';

/**
 * Every market implements this. The bot engine only ever talks to adapters,
 * never to an exchange or broker SDK directly.
 */
export interface MarketAdapter {
  readonly id: MarketId;
  readonly name: string;
  readonly currency: Currency;
  /** Polling cadence for this market's engine loop. */
  readonly tickMs: number;
  getPrice(symbol: string): Promise<Quote>;
  getCandles(symbol: string, interval: Interval, limit: number): Promise<Candle[]>;
  isOpen(now?: Date): boolean;
  getCosts(trade: TradeIntent): CostBreakdown;
  listSymbols(): Promise<string[]>;
}

/** Optional capability: quotes for the same symbol across several venues (crypto arbitrage). */
export interface MultiVenueQuotes {
  getVenueQuotes(symbol: string): Promise<Quote[]>;
}

export function hasVenueQuotes(a: MarketAdapter): a is MarketAdapter & MultiVenueQuotes {
  return typeof (a as Partial<MultiVenueQuotes>).getVenueQuotes === 'function';
}

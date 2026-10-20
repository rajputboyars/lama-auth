import ccxt from 'ccxt';
import { logger } from '../config/logger.js';
import type { CostConfig } from '../services/costModel.js';
import { withRetry } from '../services/retry.js';
import type { Candle, Quote } from '../types.js';
import { BaseAdapter } from './base.js';
import type { Interval, MarketAdapter, MultiVenueQuotes } from './types.js';

/** The subset of a CCXT exchange we use (lets tests inject fakes). */
export interface CcxtLike {
  id: string;
  fetchTicker(
    symbol: string,
  ): Promise<{ last?: number | null; close?: number | null; timestamp?: number | null }>;
  fetchOHLCV(symbol: string, timeframe: string, since?: number, limit?: number): Promise<unknown[]>;
}

export function createExchanges(ids: string[]): CcxtLike[] {
  const registry = ccxt as unknown as Record<string, new (opts: object) => CcxtLike>;
  return ids.map((id) => {
    const Ctor = registry[id];
    if (typeof Ctor !== 'function') throw new Error(`Unknown CCXT exchange: ${id}`);
    // Public endpoints only. No API keys are ever passed: this bot cannot place real orders.
    return new Ctor({ enableRateLimit: true, timeout: 10_000 });
  });
}

export class CryptoAdapter extends BaseAdapter implements MarketAdapter, MultiVenueQuotes {
  readonly id = 'crypto' as const;
  readonly name = 'Crypto';
  readonly currency = 'USD' as const;
  readonly tickMs = 15_000;

  constructor(
    private readonly exchanges: CcxtLike[],
    private readonly symbols: string[],
    costs: CostConfig,
  ) {
    super(costs);
    if (exchanges.length === 0) throw new Error('CryptoAdapter needs at least one exchange');
  }

  private get primary() {
    return this.exchanges[0];
  }

  async getPrice(symbol: string): Promise<Quote> {
    return this.quoteFrom(this.primary, symbol);
  }

  async getVenueQuotes(symbol: string): Promise<Quote[]> {
    const results = await Promise.allSettled(
      this.exchanges.map((ex) => this.quoteFrom(ex, symbol)),
    );
    return results.flatMap((r, i) => {
      if (r.status === 'fulfilled') return [r.value];
      logger.debug(
        { exchange: this.exchanges[i].id, symbol, err: String(r.reason) },
        'venue quote failed',
      );
      return [];
    });
  }

  async getCandles(symbol: string, interval: Interval, limit: number): Promise<Candle[]> {
    const rows = await withRetry(() => this.primary.fetchOHLCV(symbol, interval, undefined, limit));
    return (rows as number[][]).map(([time, open, high, low, close, volume]) => ({
      time,
      open,
      high,
      low,
      close,
      volume: volume ?? 0,
    }));
  }

  isOpen(): boolean {
    return true; // crypto trades 24/7
  }

  async listSymbols(): Promise<string[]> {
    return this.symbols;
  }

  private async quoteFrom(ex: CcxtLike, symbol: string): Promise<Quote> {
    const t = await withRetry(() => ex.fetchTicker(symbol), { retries: 2 });
    const price = t.last ?? t.close;
    if (!price) throw new Error(`${ex.id} returned no price for ${symbol}`);
    return { symbol, price, time: t.timestamp ?? Date.now(), source: ex.id };
  }
}

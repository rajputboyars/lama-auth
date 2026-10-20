import YahooFinance from 'yahoo-finance2';
import { RateLimiter, withRetry } from '../services/retry.js';
import type { Candle, Quote } from '../types.js';
import { INTERVAL_MS } from './base.js';
import type { Interval } from './types.js';

/** A source of prices that market adapters can be built on (Yahoo, Kite, Upstox, ...). */
export interface PriceProvider {
  readonly name: string;
  getPrice(symbol: string): Promise<Quote>;
  getCandles(symbol: string, interval: Interval, limit: number): Promise<Candle[]>;
}

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const YAHOO_INTERVAL: Record<Interval, '1m' | '5m' | '15m' | '60m' | '1d'> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '60m',
  '1d': '1d',
};

/**
 * Unofficial Yahoo Finance data. Delayed (often 15+ min) and may break without notice:
 * fine for paper trading practice, never for anything that needs exact prices.
 */
export class YahooProvider implements PriceProvider {
  readonly name = 'yahoo';
  private readonly limiter = new RateLimiter(500);

  /** `mapSymbol` lets India map RELIANCE -> RELIANCE.NS, etc. */
  constructor(private readonly mapSymbol: (s: string) => string = (s) => s) {}

  async getPrice(symbol: string): Promise<Quote> {
    const q = await this.call(() => yahooFinance.quote(this.mapSymbol(symbol)));
    const price = q?.regularMarketPrice;
    if (!price) throw new Error(`Yahoo returned no price for ${symbol}`);
    const time = q.regularMarketTime ? new Date(q.regularMarketTime).getTime() : Date.now();
    return { symbol, price, time, source: 'yahoo (delayed)' };
  }

  async getCurrency(symbol: string): Promise<string | undefined> {
    const q = await this.call(() => yahooFinance.quote(this.mapSymbol(symbol)));
    return q?.currency;
  }

  async getCandles(symbol: string, interval: Interval, limit: number): Promise<Candle[]> {
    // Yahoo only keeps ~7 days of 1m data; ask for a window wide enough to cover weekends.
    const span = INTERVAL_MS[interval] * limit * 3;
    const period1 = new Date(Date.now() - Math.min(span, interval === '1m' ? 6.5 * 86_400_000 : span));
    const res = await this.call(() =>
      yahooFinance.chart(this.mapSymbol(symbol), { period1, interval: YAHOO_INTERVAL[interval] }),
    );
    return res.quotes
      .filter((q) => q.open != null && q.high != null && q.low != null && q.close != null)
      .map((q) => ({
        time: new Date(q.date).getTime(),
        open: q.open!,
        high: q.high!,
        low: q.low!,
        close: q.close!,
        volume: q.volume ?? 0,
      }))
      .slice(-limit);
  }

  private call<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter.schedule(() => withRetry(fn, { retries: 2 }));
  }
}

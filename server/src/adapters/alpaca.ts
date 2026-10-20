import { RateLimiter, withRetry } from '../services/retry.js';
import type { Candle, Quote } from '../types.js';
import { INTERVAL_MS } from './base.js';
import type { Interval } from './types.js';
import type { PriceProvider } from './yahoo.js';

const TIMEFRAME: Record<Interval, string> = {
  '1m': '1Min',
  '5m': '5Min',
  '15m': '15Min',
  '1h': '1Hour',
  '1d': '1Day',
};

/** Alpaca market data (read-only). The free plan's IEX feed covers only part of US volume. */
export class AlpacaProvider implements PriceProvider {
  readonly name = 'alpaca';
  // Free plan allows 200 req/min; stay well under it.
  private readonly limiter = new RateLimiter(400);

  constructor(
    private readonly keyId: string,
    private readonly secret: string,
    private readonly feed: 'iex' | 'sip' = 'iex',
    private readonly baseUrl = 'https://data.alpaca.markets',
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async getPrice(symbol: string): Promise<Quote> {
    const body = await this.get<{ trade?: { p: number; t: string } }>(
      `/v2/stocks/${encodeURIComponent(symbol)}/trades/latest?feed=${this.feed}`,
    );
    if (!body.trade?.p) throw new Error(`Alpaca returned no trade for ${symbol}`);
    return {
      symbol,
      price: body.trade.p,
      time: Date.parse(body.trade.t),
      source: `alpaca/${this.feed}`,
    };
  }

  async getCandles(symbol: string, interval: Interval, limit: number): Promise<Candle[]> {
    // Look back far enough to cover nights and weekends, newest first, then reverse.
    const start = new Date(Date.now() - INTERVAL_MS[interval] * limit * 5).toISOString();
    const qs = new URLSearchParams({
      timeframe: TIMEFRAME[interval],
      limit: String(limit),
      start,
      sort: 'desc',
      feed: this.feed,
    });
    const body = await this.get<{
      bars?: { t: string; o: number; h: number; l: number; c: number; v: number }[];
    }>(`/v2/stocks/${encodeURIComponent(symbol)}/bars?${qs}`);
    return (body.bars ?? [])
      .map((b) => ({
        time: Date.parse(b.t),
        open: b.o,
        high: b.h,
        low: b.l,
        close: b.c,
        volume: b.v,
      }))
      .reverse();
  }

  private get<T>(path: string): Promise<T> {
    return this.limiter.schedule(() =>
      withRetry(async () => {
        const res = await this.fetchImpl(this.baseUrl + path, {
          headers: { 'APCA-API-KEY-ID': this.keyId, 'APCA-API-SECRET-KEY': this.secret },
        });
        if (!res.ok) throw new Error(`Alpaca ${res.status}: ${await res.text()}`);
        return (await res.json()) as T;
      }),
    );
  }
}

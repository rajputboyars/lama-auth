import { RateLimiter, withRetry } from '../../services/retry.js';
import type { Candle, Quote } from '../../types.js';
import { INTERVAL_MS } from '../base.js';
import type { Interval } from '../types.js';
import type { PriceProvider } from '../yahoo.js';

const KITE_INTERVAL: Record<Interval, string> = {
  '1m': 'minute',
  '5m': '5minute',
  '15m': '15minute',
  '1h': '60minute',
  '1d': 'day',
};

/** Kite timestamps are IST; format a Date as "yyyy-mm-dd hh:mm:ss" in IST. */
function istString(d: Date): string {
  return new Date(d.getTime() + 5.5 * 3_600_000).toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Zerodha Kite Connect market data (needs the paid data add-on and a daily access token).
 * Read-only: this class never calls order endpoints.
 */
export class KiteProvider implements PriceProvider {
  readonly name = 'kite';
  private readonly limiter = new RateLimiter(350); // Kite allows ~3 req/s
  private tokens: Map<string, number> | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly accessToken: string,
    private readonly exchange: 'NSE' | 'BSE' = 'NSE',
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async getPrice(symbol: string): Promise<Quote> {
    const key = `${this.exchange}:${symbol}`;
    const body = await this.getJson<{ data: Record<string, { last_price: number }> }>(
      `/quote/ltp?i=${encodeURIComponent(key)}`,
    );
    const price = body.data?.[key]?.last_price;
    if (!price) throw new Error(`Kite returned no price for ${key}`);
    return { symbol, price, time: Date.now(), source: 'kite' };
  }

  async getCandles(symbol: string, interval: Interval, limit: number): Promise<Candle[]> {
    const token = await this.instrumentToken(symbol);
    const to = new Date();
    const from = new Date(to.getTime() - INTERVAL_MS[interval] * limit * 5);
    const qs = new URLSearchParams({ from: istString(from), to: istString(to) });
    const body = await this.getJson<{ data: { candles: [string, number, number, number, number, number][] } }>(
      `/instruments/historical/${token}/${KITE_INTERVAL[interval]}?${qs}`,
    );
    return body.data.candles
      .map(([t, open, high, low, close, volume]) => ({ time: Date.parse(t), open, high, low, close, volume }))
      .slice(-limit);
  }

  private async instrumentToken(symbol: string): Promise<number> {
    if (!this.tokens) {
      const csv = await this.request(`/instruments/${this.exchange}`).then((r) => r.text());
      this.tokens = new Map();
      for (const line of csv.split('\n').slice(1)) {
        const cols = line.split(',');
        if (cols.length > 2) this.tokens.set(cols[2], Number(cols[0])); // tradingsymbol -> instrument_token
      }
    }
    const token = this.tokens.get(symbol);
    if (!token) throw new Error(`Unknown ${this.exchange} symbol: ${symbol}`);
    return token;
  }

  private async getJson<T>(path: string): Promise<T> {
    return (await this.request(path)).json() as Promise<T>;
  }

  private request(path: string): Promise<Response> {
    return this.limiter.schedule(() =>
      withRetry(async () => {
        const res = await this.fetchImpl(`https://api.kite.trade${path}`, {
          headers: { 'X-Kite-Version': '3', Authorization: `token ${this.apiKey}:${this.accessToken}` },
        });
        if (!res.ok) throw new Error(`Kite ${res.status}: ${await res.text()}`);
        return res;
      }),
    );
  }
}

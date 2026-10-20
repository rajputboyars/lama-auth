import type { Candle, Quote } from '../../types.js';
import type { PriceProvider } from '../yahoo.js';

/**
 * Placeholder for brokers that are wired into config but not built yet (Upstox, Angel One).
 * To add one: implement PriceProvider (getPrice + getCandles) and register it in india/index.ts.
 */
export class NotImplementedProvider implements PriceProvider {
  constructor(readonly name: string) {}

  getPrice(): Promise<Quote> {
    return Promise.reject(new Error(`${this.name} data provider is not implemented yet`));
  }

  getCandles(): Promise<Candle[]> {
    return Promise.reject(new Error(`${this.name} data provider is not implemented yet`));
  }
}

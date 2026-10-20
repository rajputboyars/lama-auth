import { BaseAdapter } from '../src/adapters/base.js';
import type { Interval, MarketAdapter } from '../src/adapters/types.js';
import { DEFAULT_COSTS } from '../src/services/costModel.js';
import type { Candle, Quote } from '../src/types.js';

export const HOUR = 3_600_000;

export function candlesFromCloses(closes: number[], start = Date.UTC(2026, 0, 5)): Candle[] {
  return closes.map((close, i) => {
    const open = i === 0 ? close : closes[i - 1];
    return {
      time: start + i * HOUR,
      open,
      high: Math.max(open, close) * 1.001,
      low: Math.min(open, close) * 0.999,
      close,
      volume: 100,
    };
  });
}

/** Flat, then a steady rise, then a steady fall: forces one MA cross up and one down. */
export function upThenDown(): number[] {
  return [
    ...Array.from({ length: 40 }, () => 100),
    ...Array.from({ length: 40 }, (_, i) => 100 + (i + 1)),
    ...Array.from({ length: 60 }, (_, i) => 140 - (i + 1)),
  ];
}

export class FakeAdapter extends BaseAdapter implements MarketAdapter {
  readonly id = 'crypto' as const;
  readonly name = 'Fake';
  readonly currency = 'USD' as const;
  readonly tickMs = 1000;
  open = true;
  prices: Record<string, number> = { 'BTC/USDT': 100 };
  candles: Candle[] = [];
  failPrice = false;

  constructor() {
    super({ ...DEFAULT_COSTS.crypto, delayMs: 0, failChance: 0 });
  }
  async getPrice(symbol: string): Promise<Quote> {
    if (this.failPrice) throw new Error('exchange down');
    return { symbol, price: this.prices[symbol], time: Date.now(), source: 'fake' };
  }
  async getCandles(_s: string, _i: Interval, limit: number) {
    return this.candles.slice(-limit);
  }
  isOpen() {
    return this.open;
  }
  async listSymbols() {
    return Object.keys(this.prices);
  }
}

import type { CostConfig } from '../services/costModel.js';
import type { Candle, Currency, MarketId, Quote } from '../types.js';
import { BaseAdapter } from './base.js';
import { type Session, isSessionOpen } from './marketHours.js';
import type { Interval, MarketAdapter } from './types.js';
import type { PriceProvider } from './yahoo.js';

export interface ProviderAdapterOptions {
  id: MarketId;
  name: string;
  currency: Currency;
  session: Session;
  symbols: string[];
  tickMs: number;
  costs: CostConfig;
}

/** A market adapter whose data comes from any PriceProvider. Swapping brokers = swapping providers. */
export class ProviderAdapter extends BaseAdapter implements MarketAdapter {
  readonly id: MarketId;
  readonly name: string;
  readonly currency: Currency;
  readonly tickMs: number;
  private readonly session: Session;
  private symbols: string[];

  constructor(
    readonly provider: PriceProvider,
    opts: ProviderAdapterOptions,
  ) {
    super(opts.costs);
    this.id = opts.id;
    this.name = `${opts.name} (${provider.name})`;
    this.currency = opts.currency;
    this.tickMs = opts.tickMs;
    this.session = opts.session;
    this.symbols = opts.symbols;
  }

  getPrice(symbol: string): Promise<Quote> {
    return this.provider.getPrice(symbol);
  }

  getCandles(symbol: string, interval: Interval, limit: number): Promise<Candle[]> {
    return this.provider.getCandles(symbol, interval, limit);
  }

  isOpen(now: Date = new Date()): boolean {
    return isSessionOpen(this.session, now);
  }

  async listSymbols(): Promise<string[]> {
    return this.symbols;
  }

  setSymbols(symbols: string[]): void {
    this.symbols = symbols;
  }
}

import type { CostConfig } from '../services/costModel.js';
import type { Candle, MarketId, Position, Quote, Signal } from '../types.js';

export interface ParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export type Params = Record<string, number>;

export interface StrategyContext {
  /** Same symbol quoted on several venues (only provided to cross-venue strategies). */
  venueQuotes?: Quote[];
  costs?: CostConfig;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  /** Markets this strategy may run on; 'all' for any. */
  markets: MarketId[] | 'all';
  params: ParamSpec[];
  /** False when the strategy cannot be replayed from single-venue candles. */
  backtestable: boolean;
  minCandles(params: Params): number;
  check(candles: Candle[], position: Position | null, params?: Params, ctx?: StrategyContext): Signal;
}

export function withDefaults(specs: ParamSpec[], params: Params = {}): Params {
  const out: Params = {};
  for (const s of specs) {
    const v = params[s.key];
    out[s.key] = typeof v === 'number' && Number.isFinite(v) ? Math.min(s.max, Math.max(s.min, v)) : s.default;
  }
  return out;
}

export const wait = (reason: string): Signal => ({ action: 'wait', reason });

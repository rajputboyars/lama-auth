import type { Interval } from '../adapters/types.js';
import type { WalletState } from '../services/paperWallet.js';
import type { Settings } from '../services/settings.js';
import type { Action, Candle, Currency, MarketId, Side } from '../types.js';

export interface WalletRecord extends WalletState {
  /** UTC day the daily-loss baseline belongs to. */
  dayKey?: string;
  dayStartEquity?: number;
}

export interface TradeRecord {
  id?: string;
  market: MarketId;
  strategy: string;
  symbol: string;
  currency: Currency;
  side: Side | 'arb';
  status: 'filled' | 'failed';
  quantity: number;
  refPrice: number;
  fillPrice: number;
  fees: number;
  taxes: number;
  spreadCost: number;
  slippageCost: number;
  pnl: number;
  reason: string;
  time: number;
  review?: { note: string; at: number };
}

export interface SignalRecord {
  market: MarketId;
  strategy: string;
  symbol: string;
  action: Action;
  reason: string;
  taken: boolean;
  skipReason?: string;
  price: number;
  time: number;
}

export interface TradeQuery {
  market?: MarketId;
  strategy?: string;
  status?: 'filled' | 'failed';
  page: number;
  pageSize: number;
}

export interface SignalQuery {
  market?: MarketId;
  strategy?: string;
  taken?: boolean;
  page: number;
  pageSize: number;
}

/** Persistence used by the engine. MongoStore in production, MemoryStore in tests. */
export interface Store {
  getSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<void>;
  getWallet(market: MarketId, strategy: string): Promise<WalletRecord | null>;
  saveWallet(w: WalletRecord): Promise<void>;
  listWallets(): Promise<WalletRecord[]>;
  insertTrade(t: TradeRecord): Promise<TradeRecord>;
  listTrades(q: TradeQuery): Promise<{ items: TradeRecord[]; total: number }>;
  getTrade(id: string): Promise<TradeRecord | null>;
  reviewTrade(id: string, note: string, at: number): Promise<TradeRecord | null>;
  insertSignal(s: SignalRecord): Promise<void>;
  listSignals(q: SignalQuery): Promise<{ items: SignalRecord[]; total: number }>;
  resetWallets(filter: { market?: MarketId; strategy?: string }): Promise<number>;
  saveCandles(
    market: MarketId,
    symbol: string,
    interval: Interval,
    candles: Candle[],
  ): Promise<void>;
  getCandles(
    market: MarketId,
    symbol: string,
    interval: Interval,
    from?: number,
    to?: number,
    limit?: number,
  ): Promise<Candle[]>;
}

export type MarketId = 'crypto' | 'us' | 'india' | 'global';
export const MARKET_IDS: MarketId[] = ['crypto', 'us', 'india', 'global'];

export type Currency = 'USD' | 'INR';
export type Side = 'buy' | 'sell';
export type Action = 'buy' | 'sell' | 'wait';

export interface Candle {
  time: number; // ms epoch of candle open
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  symbol: string;
  price: number;
  time: number;
  source: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number; // includes buy-side costs per unit
  openedAt: number;
}

export interface TradeIntent {
  side: Side;
  symbol: string;
  quantity: number;
  price: number; // reference (mid) price
}

export interface CostBreakdown {
  fillPrice: number;
  notional: number;
  fees: number;
  taxes: number;
  spreadCost: number;
  slippageCost: number;
  total: number; // fees + taxes (cash charges); spread+slippage are already inside fillPrice
}

export interface Signal {
  action: Action;
  reason: string;
}

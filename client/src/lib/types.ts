export type MarketId = 'crypto' | 'us' | 'india' | 'global';
export type Currency = 'USD' | 'INR';

export interface Trade {
  id?: string;
  market: MarketId;
  strategy: string;
  symbol: string;
  currency: Currency;
  side: 'buy' | 'sell' | 'arb';
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

export interface MarketState {
  status: 'idle' | 'running' | 'closed' | 'disabled' | 'halted' | 'error';
  lastTickAt?: number;
  lastError?: string;
  consecutiveErrors: number;
}

export interface BotStatus {
  running: boolean;
  killSwitch: boolean;
  markets: Record<string, MarketState>;
}

export interface PriceUpdate {
  market: MarketId;
  symbol: string;
  price: number;
  time: number;
  source: string;
}

export interface StrategyRow {
  market: MarketId;
  strategy: string;
  currency: Currency;
  equity: number;
  startingCash: number;
  openPositions: number;
  trades: number;
  wins: number;
  losses: number;
  winRatePct: number;
  totalReturnPct: number;
  netPnl: number;
  costsPaid: number;
  maxDrawdownPct: number;
  sharpe: number | null;
  profitFactor: number | null;
  ranked: boolean;
  rank?: number | null;
}

export interface EquityPoint {
  time: number;
  equity: number;
}

export interface Stats {
  totals: Partial<
    Record<
      Currency,
      { equity: number; startingCash: number; pnl: number; pnlPct: number; costsPaid: number }
    >
  >;
  strategies: StrategyRow[];
  leaderboard: StrategyRow[];
  realizedCurve: Partial<Record<Currency, EquityPoint[]>>;
  status: BotStatus;
}

export interface ParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface StrategyInfo {
  id: string;
  name: string;
  description: string;
  markets: MarketId[] | 'all';
  params: ParamSpec[];
  backtestable: boolean;
}

export interface TaxRule {
  name: string;
  side: 'buy' | 'sell' | 'both';
  base: 'notional' | 'fees';
  pct: number;
  fixed?: number;
}

export interface CostConfig {
  feePct: number;
  feeFixed: number;
  feeMin: number;
  feeMax?: number;
  taxes: TaxRule[];
  spreadPct: number;
  slippagePct: number;
  delayMs: number;
  failChance: number;
}

export interface RiskConfig {
  maxTradePct: number;
  maxTradeValue: number;
  dailyLossLimitPct: number;
  maxOpenPositions: number;
  killSwitch: boolean;
}

export interface Settings {
  botRunning: boolean;
  candleInterval: '1m' | '5m' | '15m' | '1h';
  risk: RiskConfig;
  costs: Record<MarketId, CostConfig>;
  markets: Record<MarketId, { enabled: boolean }>;
  strategies: Record<string, { enabled: boolean; params: Record<string, number> }>;
}

export interface MarketInfo {
  id: MarketId;
  name: string;
  currency: Currency;
  open: boolean;
  enabled: boolean;
  symbols: string[];
  state?: MarketState;
}

export interface Profile {
  level: number;
  xp: number;
  levelFloorXp: number;
  nextLevelXp: number;
  progressPct: number;
  counters: Record<string, unknown>;
}

export interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number | null;
  progress: { current: number; target: number };
}

export interface Quest {
  key: string;
  title: string;
  description: string;
  cadence: 'daily' | 'weekly';
  progress: number;
  target: number;
  xp: number;
  completedAt: number | null;
}

export interface BacktestResult {
  stats: StrategyRow & { avgWin: number; avgLoss: number };
  trades: {
    time: number;
    side: 'buy' | 'sell';
    price: number;
    quantity: number;
    fees: number;
    taxes: number;
    pnl: number;
    reason: string;
  }[];
  equityCurve: EquityPoint[];
  failedOrders: number;
  blockedSignals: number;
  notes: string[];
  source: string;
  candles: number;
  currency: Currency;
}

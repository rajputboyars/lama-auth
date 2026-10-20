import type { CostBreakdown, MarketId, Side, TradeIntent } from '../types.js';

/** All percentages are in percent units: 0.1 means 0.1%. */
export interface TaxRule {
  name: string;
  side: Side | 'both';
  /** 'notional' = % of trade value; 'fees' = % of brokerage/exchange fees (e.g. GST). */
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
  failChance: number; // 0..1
}

/**
 * Defaults lean pessimistic on purpose: paper results must never look better than reality.
 * Every value is overridable per market from Settings.
 */
export const DEFAULT_COSTS: Record<MarketId, CostConfig> = {
  crypto: {
    feePct: 0.1, // typical taker fee
    feeFixed: 0,
    feeMin: 0,
    taxes: [],
    spreadPct: 0.05,
    slippagePct: 0.05,
    delayMs: 500,
    failChance: 0.01,
  },
  us: {
    feePct: 0, // commission-free brokers still pay regulatory fees below
    feeFixed: 0,
    feeMin: 0,
    taxes: [
      { name: 'SEC fee', side: 'sell', base: 'notional', pct: 0.00278 },
      { name: 'FINRA TAF', side: 'sell', base: 'notional', pct: 0.0166 },
    ],
    spreadPct: 0.03,
    slippagePct: 0.03,
    delayMs: 300,
    failChance: 0.005,
  },
  india: {
    // Equity delivery: exchange txn charge + SEBI fee as fees, statutory levies as taxes
    feePct: 0.00307,
    feeFixed: 0,
    feeMin: 0,
    taxes: [
      { name: 'STT', side: 'both', base: 'notional', pct: 0.1 },
      { name: 'Stamp duty', side: 'buy', base: 'notional', pct: 0.015 },
      { name: 'GST', side: 'both', base: 'fees', pct: 18 },
      { name: 'DP charges', side: 'sell', base: 'notional', pct: 0, fixed: 15.93 },
    ],
    spreadPct: 0.05,
    slippagePct: 0.05,
    delayMs: 500,
    failChance: 0.01,
  },
  global: {
    feePct: 0.1,
    feeFixed: 0,
    feeMin: 1,
    taxes: [],
    spreadPct: 0.1,
    slippagePct: 0.1,
    delayMs: 1000,
    failChance: 0.01,
  },
};

const pct = (value: number, percent: number) => (value * percent) / 100;

export function fillPriceFor(side: Side, mid: number, cfg: CostConfig): number {
  const adverse = (cfg.spreadPct / 2 + cfg.slippagePct) / 100;
  return side === 'buy' ? mid * (1 + adverse) : mid * (1 - adverse);
}

export function estimateCosts(trade: TradeIntent, cfg: CostConfig): CostBreakdown {
  if (trade.quantity <= 0 || trade.price <= 0) throw new Error('Trade needs positive quantity and price');

  const fillPrice = fillPriceFor(trade.side, trade.price, cfg);
  const notional = fillPrice * trade.quantity;
  const spreadCost = pct(trade.price, cfg.spreadPct / 2) * trade.quantity;
  const slippageCost = pct(trade.price, cfg.slippagePct) * trade.quantity;

  let fees = pct(notional, cfg.feePct) + cfg.feeFixed;
  fees = Math.max(fees, cfg.feeMin);
  if (cfg.feeMax !== undefined) fees = Math.min(fees, cfg.feeMax);

  const applies = (r: TaxRule) => r.side === 'both' || r.side === trade.side;
  const taxes = cfg.taxes.filter(applies).reduce((sum, r) => {
    const base = r.base === 'fees' ? fees : notional;
    return sum + pct(base, r.pct) + (r.fixed ?? 0);
  }, 0);

  return { fillPrice, notional, fees, taxes, spreadCost, slippageCost, total: fees + taxes };
}

/** Returns true when a simulated order should be rejected (exchange error, timeout, etc.). */
export function rollFailure(cfg: CostConfig, rng: () => number = Math.random): boolean {
  return rng() < cfg.failChance;
}

export function mergeCostConfig(base: CostConfig, override?: Partial<CostConfig>): CostConfig {
  return { ...base, ...(override ?? {}), taxes: override?.taxes ?? base.taxes };
}

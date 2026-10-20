import { type CostConfig, estimateCosts } from '../services/costModel.js';
import type { CostBreakdown, Currency, MarketId, TradeIntent } from '../types.js';

/** Shared plumbing: every adapter prices its costs with its own (configurable) cost table. */
export abstract class BaseAdapter {
  abstract readonly id: MarketId;
  abstract readonly name: string;
  abstract readonly currency: Currency;
  protected costs: CostConfig;

  constructor(costs: CostConfig) {
    this.costs = costs;
  }

  getCosts(trade: TradeIntent): CostBreakdown {
    return estimateCosts(trade, this.costs);
  }

  getCostConfig(): CostConfig {
    return this.costs;
  }

  setCostConfig(costs: CostConfig): void {
    this.costs = costs;
  }
}

export const INTERVAL_MS = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '1d': 86_400_000,
} as const;

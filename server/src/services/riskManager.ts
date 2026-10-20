import type { Action } from '../types.js';

export interface RiskConfig {
  /** Max % of wallet equity committed to a single new trade. */
  maxTradePct: number;
  /** Absolute cap per trade in the wallet's currency (0 = no cap). */
  maxTradeValue: number;
  /** Stop opening trades once today's loss reaches this % of start-of-day equity. */
  dailyLossLimitPct: number;
  maxOpenPositions: number;
  killSwitch: boolean;
}

export const DEFAULT_RISK: RiskConfig = {
  maxTradePct: 10,
  maxTradeValue: 0,
  dailyLossLimitPct: 3,
  maxOpenPositions: 3,
  killSwitch: false,
};

export interface RiskInput {
  action: Action;
  price: number;
  equity: number;
  cash: number;
  openPositions: number;
  heldQuantity: number;
  dayStartEquity: number;
  /** Rough cost multiplier so the buy still fits in cash after fees (e.g. 1.005). */
  costBuffer?: number;
}

export type RiskBlock =
  'kill_switch' | 'daily_loss_limit' | 'max_positions' | 'no_cash' | 'no_position' | 'too_small';

export type RiskDecision =
  | { allowed: true; quantity: number; reason: string }
  | { allowed: false; block: RiskBlock; reason: string };

export function dailyLossPct(dayStartEquity: number, equityNow: number): number {
  if (dayStartEquity <= 0) return 0;
  return Math.max(0, ((dayStartEquity - equityNow) / dayStartEquity) * 100);
}

export function evaluate(input: RiskInput, cfg: RiskConfig): RiskDecision {
  if (cfg.killSwitch) return { allowed: false, block: 'kill_switch', reason: 'Kill switch is ON' };

  if (input.action === 'sell') {
    // Exits are always allowed: closing a position can only reduce risk.
    if (input.heldQuantity <= 0)
      return { allowed: false, block: 'no_position', reason: 'Nothing to sell' };
    return { allowed: true, quantity: input.heldQuantity, reason: 'Exit full position' };
  }

  const loss = dailyLossPct(input.dayStartEquity, input.equity);
  if (loss >= cfg.dailyLossLimitPct) {
    return {
      allowed: false,
      block: 'daily_loss_limit',
      reason: `Daily loss ${loss.toFixed(2)}% hit limit ${cfg.dailyLossLimitPct}%`,
    };
  }
  if (input.heldQuantity <= 0 && input.openPositions >= cfg.maxOpenPositions) {
    return {
      allowed: false,
      block: 'max_positions',
      reason: `Max open positions (${cfg.maxOpenPositions}) reached`,
    };
  }

  let budget = (input.equity * cfg.maxTradePct) / 100;
  if (cfg.maxTradeValue > 0) budget = Math.min(budget, cfg.maxTradeValue);
  budget = Math.min(budget, input.cash / (input.costBuffer ?? 1.01));
  if (budget <= 0) return { allowed: false, block: 'no_cash', reason: 'No free cash' };

  const quantity = budget / input.price;
  if (!(quantity > 0) || budget < 1)
    return { allowed: false, block: 'too_small', reason: 'Trade size too small' };
  return { allowed: true, quantity, reason: `Size ${budget.toFixed(2)} (${cfg.maxTradePct}% cap)` };
}

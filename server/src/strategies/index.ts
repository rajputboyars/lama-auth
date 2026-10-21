import type { MarketId } from '../types.js';
import { arbitrage } from './arbitrage.js';
import { autoPilot } from './autoPilot.js';
import { breakout } from './breakout.js';
import { meanReversion } from './meanReversion.js';
import { trendFollowing } from './trendFollowing.js';
import type { Strategy } from './types.js';
import { yourPick } from './yourPick.js';

export const STRATEGIES: Strategy[] = [
  trendFollowing,
  meanReversion,
  breakout,
  arbitrage,
  autoPilot,
  yourPick,
];

export function getStrategy(id: string): Strategy | undefined {
  return STRATEGIES.find((s) => s.id === id);
}

export function strategiesFor(market: MarketId): Strategy[] {
  return STRATEGIES.filter((s) => s.markets === 'all' || s.markets.includes(market));
}

export type { Strategy } from './types.js';

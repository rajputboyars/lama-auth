import { breakout } from './breakout.js';
import { meanReversion } from './meanReversion.js';
import { trendFollowing } from './trendFollowing.js';
import { type Strategy, wait } from './types.js';

/** Strategies a user may pick in You vs Bot: single-venue ones, never the bot itself. */
export const PICKABLE: Strategy[] = [trendFollowing, meanReversion, breakout];
export const PICKABLE_IDS = PICKABLE.map((s) => s.id) as [string, ...string[]];

export const yourPick: Strategy = {
  id: 'user',
  name: 'Your Pick',
  description:
    'Runs whichever strategy you chose for this market in You vs Bot, in its own wallet next to the bot.',
  markets: 'all',
  // Backtest the underlying strategy directly instead.
  backtestable: false,
  params: [],
  minCandles: () => Math.max(...PICKABLE.map((s) => s.minCandles({}))),
  check(candles, position, _params, ctx) {
    const picked = PICKABLE.find((s) => s.id === ctx?.userStrategyId);
    if (!picked) return wait('No strategy picked for this market yet');
    const sig = picked.check(candles, position, ctx?.strategyParams?.[picked.id], ctx);
    return {
      ...sig,
      reason: `${picked.name}: ${sig.reason}`,
      meta: { chosen: picked.id },
    };
  },
};

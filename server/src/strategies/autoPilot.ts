import type { Signal } from '../types.js';
import { breakout } from './breakout.js';
import { meanReversion } from './meanReversion.js';
import { type Mood, REGIME_MIN_CANDLES, detectRegime } from './regime.js';
import { trendFollowing } from './trendFollowing.js';
import { type Strategy, wait } from './types.js';

/** Which single-market strategy Auto-Pilot hands each mood to. Downtrend/unclear: stay out. */
export const MOOD_STRATEGY: Record<Mood, Strategy | null> = {
  uptrend: trendFollowing,
  sideways: meanReversion,
  squeeze: breakout,
  downtrend: null,
  unclear: null,
};

const SUBS = [trendFollowing, meanReversion, breakout];

export const autoPilot: Strategy = {
  id: 'auto',
  name: 'Bot Auto-Pilot',
  description:
    'Reads the market mood on every candle and uses the strategy that suits it: Trend Rider in an uptrend, Rubber Band when sideways, Breakout Hunter in a squeeze. Stays out of downtrends.',
  markets: 'all',
  backtestable: true,
  params: [],
  minCandles: () => Math.max(REGIME_MIN_CANDLES, ...SUBS.map((s) => s.minCandles({}))),
  check(candles, position, _params, ctx): Signal {
    const regime = detectRegime(candles);
    const chosen = MOOD_STRATEGY[regime.mood];
    const meta = { mood: regime.mood, chosen: chosen?.id ?? 'none' };
    const paramsOf = (s: Strategy) => ctx?.strategyParams?.[s.id];

    if (position) {
      if (regime.mood === 'downtrend')
        return {
          action: 'sell',
          reason: `Market turned into a downtrend, selling to protect money. ${regime.reason}`,
          meta,
        };
      // With no strategy for the mood, let any of them close the position it may have opened.
      for (const s of chosen ? [chosen] : SUBS) {
        const sig = s.check(candles, position, paramsOf(s), ctx);
        if (sig.action === 'sell')
          return {
            action: 'sell',
            reason: `Market is ${regime.mood}, using ${s.name}: ${sig.reason}`,
            meta,
          };
      }
      return { ...wait(`Holding. Market is ${regime.mood}`), meta };
    }

    if (!chosen) return { ...wait(`Staying out: ${regime.reason}`), meta };
    const sig = chosen.check(candles, null, paramsOf(chosen), ctx);
    if (sig.action === 'buy')
      return {
        action: 'buy',
        reason: `Market is ${regime.mood}, using ${chosen.name}: ${sig.reason}`,
        meta,
      };
    return { ...wait(`Market is ${regime.mood}, ${chosen.name} waiting: ${sig.reason}`), meta };
  },
};

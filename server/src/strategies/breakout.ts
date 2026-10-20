import { highest, lowest } from './indicators.js';
import { type Strategy, wait, withDefaults } from './types.js';

export const breakout: Strategy = {
  id: 'breakout',
  name: 'Breakout Hunter',
  description:
    'Buy when price closes above the highest high of the previous N candles; exit below the lowest low of the previous M candles.',
  markets: 'all',
  backtestable: true,
  params: [
    { key: 'entryLookback', label: 'Entry lookback', min: 5, max: 200, step: 1, default: 20 },
    { key: 'exitLookback', label: 'Exit lookback', min: 2, max: 100, step: 1, default: 10 },
  ],
  minCandles: (p) => {
    const x = withDefaults(breakout.params, p);
    return Math.max(x.entryLookback, x.exitLookback) + 1;
  },
  check(candles, position, params) {
    const p = withDefaults(this.params, params);
    const need = Math.max(p.entryLookback, p.exitLookback) + 1;
    if (candles.length < need) return wait(`Need ${need} candles, have ${candles.length}`);
    const last = candles.at(-1)!;
    const prior = candles.slice(0, -1);

    const high = highest(prior.slice(-p.entryLookback).map((c) => c.high));
    const low = lowest(prior.slice(-p.exitLookback).map((c) => c.low));

    if (!position && last.close > high)
      return { action: 'buy', reason: `Closed above ${p.entryLookback}-period high ${high}` };
    if (position && last.close < low)
      return { action: 'sell', reason: `Closed below ${p.exitLookback}-period low ${low}` };
    return wait('Inside range');
  },
};

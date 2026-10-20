import { bollinger, rsi } from './indicators.js';
import { type Strategy, wait, withDefaults } from './types.js';

export const meanReversion: Strategy = {
  id: 'meanrev',
  name: 'Rubber Band',
  description:
    'Mean reversion: buy when RSI is oversold and price is below the lower Bollinger band; exit when RSI recovers or price reaches the middle band.',
  markets: 'all',
  backtestable: true,
  params: [
    { key: 'rsiPeriod', label: 'RSI period', min: 2, max: 50, step: 1, default: 14 },
    { key: 'oversold', label: 'Oversold RSI', min: 5, max: 50, step: 1, default: 30 },
    { key: 'exitRsi', label: 'Exit RSI', min: 40, max: 95, step: 1, default: 55 },
    { key: 'bbPeriod', label: 'Bollinger period', min: 5, max: 100, step: 1, default: 20 },
    { key: 'bbMult', label: 'Bollinger width (σ)', min: 1, max: 4, step: 0.1, default: 2 },
  ],
  minCandles: (p) => {
    const x = withDefaults(meanReversion.params, p);
    return Math.max(x.rsiPeriod + 1, x.bbPeriod);
  },
  check(candles, position, params) {
    const p = withDefaults(this.params, params);
    const closes = candles.map((c) => c.close);
    const r = rsi(closes, p.rsiPeriod);
    const bb = bollinger(closes, p.bbPeriod, p.bbMult);
    if (r === null || bb === null) return wait('Not enough candles yet');
    const price = closes.at(-1)!;

    if (!position && r < p.oversold && price < bb.lower) {
      return {
        action: 'buy',
        reason: `RSI ${r.toFixed(1)} < ${p.oversold} and price below lower band`,
      };
    }
    if (position && (r > p.exitRsi || price >= bb.mid)) {
      return {
        action: 'sell',
        reason: r > p.exitRsi ? `RSI recovered to ${r.toFixed(1)}` : 'Price back to middle band',
      };
    }
    return wait(`RSI ${r.toFixed(1)}`);
  },
};

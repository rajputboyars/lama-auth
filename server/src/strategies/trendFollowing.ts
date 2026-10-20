import { sma } from './indicators.js';
import { type Strategy, wait, withDefaults } from './types.js';

export const trendFollowing: Strategy = {
  id: 'trend',
  name: 'Trend Rider',
  description:
    'Moving-average cross: buy when the fast SMA crosses above the slow SMA, exit on the cross back down.',
  markets: 'all',
  backtestable: true,
  params: [
    { key: 'fast', label: 'Fast SMA', min: 2, max: 100, step: 1, default: 10 },
    { key: 'slow', label: 'Slow SMA', min: 5, max: 300, step: 1, default: 30 },
  ],
  minCandles: (p) => withDefaults(trendFollowing.params, p).slow + 1,
  check(candles, position, params) {
    const { fast, slow } = withDefaults(this.params, params);
    if (fast >= slow) return wait('Fast period must be shorter than slow period');
    const closes = candles.map((c) => c.close);
    if (closes.length < slow + 1) return wait(`Need ${slow + 1} candles, have ${closes.length}`);

    const prev = closes.slice(0, -1);
    const f0 = sma(prev, fast)!;
    const s0 = sma(prev, slow)!;
    const f1 = sma(closes, fast)!;
    const s1 = sma(closes, slow)!;

    if (!position && f0 <= s0 && f1 > s1)
      return { action: 'buy', reason: `SMA${fast} crossed above SMA${slow}` };
    if (position && f0 >= s0 && f1 < s1)
      return { action: 'sell', reason: `SMA${fast} crossed below SMA${slow}` };
    return wait(f1 > s1 ? 'Uptrend, no new cross' : 'Downtrend, no new cross');
  },
};

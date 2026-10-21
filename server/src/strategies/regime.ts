import type { Candle } from '../types.js';
import { sma } from './indicators.js';

export type Mood = 'uptrend' | 'downtrend' | 'sideways' | 'squeeze' | 'unclear';

export interface Regime {
  mood: Mood;
  /** Plain-English explanation, shown to beginners. */
  reason: string;
}

export const REGIME_MIN_CANDLES = 60;
const TREND_EFFICIENCY = 0.3;
const SQUEEZE_PERCENTILE = 0.2;
const SQUEEZE_VS_MEDIAN = 0.6;
const BAND_PERIOD = 20;

/**
 * How straight the path was over the last `n` closes: 1 means every step went the same way,
 * near 0 means it went back and forth (Kaufman's efficiency ratio).
 */
export function efficiencyRatio(closes: number[], n: number): number | null {
  if (closes.length < n + 1) return null;
  const tail = closes.slice(-(n + 1));
  let path = 0;
  for (let i = 1; i < tail.length; i++) path += Math.abs(tail[i] - tail[i - 1]);
  return path === 0 ? 0 : Math.abs(tail.at(-1)! - tail[0]) / path;
}

/** Bollinger band width (upper - lower) / middle, for the window ending at `end` (exclusive). */
function bandWidth(closes: number[], end: number): number | null {
  if (end < BAND_PERIOD) return null;
  const slice = closes.slice(end - BAND_PERIOD, end);
  const mid = slice.reduce((a, v) => a + v, 0) / BAND_PERIOD;
  if (mid === 0) return null;
  const sd = Math.sqrt(slice.reduce((a, v) => a + (v - mid) ** 2, 0) / BAND_PERIOD);
  return (4 * sd) / mid;
}

/**
 * Sorts recent price action into a "market mood" so Auto-Pilot can pick a suitable strategy.
 * - uptrend / downtrend: the 20-average is above / below the 50-average, rising / falling,
 *   and the path has been fairly straight
 * - squeeze: no trend and the bands are among the narrowest of the recent past
 * - sideways: no trend, normal band width
 */
export function detectRegime(candles: Candle[]): Regime {
  const closes = candles.map((c) => c.close);
  if (closes.length < REGIME_MIN_CANDLES)
    return {
      mood: 'unclear',
      reason: `Need ${REGIME_MIN_CANDLES} candles to read the market, have ${closes.length}`,
    };

  const fast = sma(closes, 20)!;
  const slow = sma(closes, 50)!;
  const fastBefore = sma(closes.slice(0, -10), 20)!;
  const slopePct = ((fast - fastBefore) / fastBefore) * 100;
  const er = efficiencyRatio(closes, 20)!;

  if (er >= TREND_EFFICIENCY && fast > slow && slopePct > 0)
    return {
      mood: 'uptrend',
      reason: `Prices are climbing steadily (20-average above 50-average, up ${slopePct.toFixed(2)}% in 10 candles)`,
    };
  if (er >= TREND_EFFICIENCY && fast < slow && slopePct < 0)
    return {
      mood: 'downtrend',
      reason: `Prices are falling steadily (20-average below 50-average, down ${Math.abs(slopePct).toFixed(2)}% in 10 candles)`,
    };

  const widths: number[] = [];
  for (let end = Math.max(BAND_PERIOD, closes.length - 100); end <= closes.length; end++) {
    const w = bandWidth(closes, end);
    if (w !== null) widths.push(w);
  }
  const now = widths.at(-1);
  if (now !== undefined && widths.length >= 30) {
    const narrower = widths.filter((w) => w < now).length / widths.length;
    const median = [...widths].sort((a, b) => a - b)[Math.floor(widths.length / 2)];
    // Both rare (low percentile) and clearly narrow, so a steady range is not called a squeeze.
    if (narrower <= SQUEEZE_PERCENTILE && now < median * SQUEEZE_VS_MEDIAN)
      return {
        mood: 'squeeze',
        reason: 'Prices have gone unusually quiet (bands are among the narrowest lately)',
      };
  }

  if (er < TREND_EFFICIENCY)
    return {
      mood: 'sideways',
      reason: 'Prices are moving back and forth without a clear direction',
    };
  return { mood: 'unclear', reason: 'Signals disagree: no clear trend or range' };
}

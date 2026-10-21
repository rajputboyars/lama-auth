/** Chart-side indicator math, mirroring server/src/strategies/indicators.ts. */

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Point {
  time: number;
  value: number;
}

/** Simple moving average at every candle that has a full window. */
export function smaSeries(candles: Candle[], period: number): Point[] {
  const out: Point[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) out.push({ time: candles[i].time, value: sum / period });
  }
  return out;
}

export function bollingerSeries(candles: Candle[], period = 20, mult = 2) {
  const upper: Point[] = [];
  const mid: Point[] = [];
  const lower: Point[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1).map((c) => c.close);
    const m = slice.reduce((a, v) => a + v, 0) / period;
    const sd = Math.sqrt(slice.reduce((a, v) => a + (v - m) ** 2, 0) / period);
    const time = candles[i].time;
    upper.push({ time, value: m + mult * sd });
    mid.push({ time, value: m });
    lower.push({ time, value: m - mult * sd });
  }
  return { upper, mid, lower };
}

/** Heikin-Ashi ("average bar") candles: smoothed bodies that make trends easier to see. */
export function heikinAshi(candles: Candle[]): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const close = (c.open + c.high + c.low + c.close) / 4;
    const open = i === 0 ? (c.open + c.close) / 2 : (out[i - 1].open + out[i - 1].close) / 2;
    out.push({
      time: c.time,
      open,
      close,
      high: Math.max(c.high, open, close),
      low: Math.min(c.low, open, close),
      volume: c.volume,
    });
  }
  return out;
}

const INTERVAL_MS: Record<string, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '1d': 86_400_000,
};

export const intervalMs = (interval: string) => INTERVAL_MS[interval] ?? 60_000;

/**
 * Folds a live price tick into the candle list: updates the last candle while the tick is
 * inside its time bucket, or starts a new candle when the bucket has rolled over.
 */
export function applyTick(
  candles: Candle[],
  price: number,
  time: number,
  interval: string,
): Candle[] {
  if (candles.length === 0 || !Number.isFinite(price)) return candles;
  const step = intervalMs(interval);
  const last = candles[candles.length - 1];
  const bucket = Math.floor(time / step) * step;
  if (bucket <= last.time) {
    const updated = {
      ...last,
      close: price,
      high: Math.max(last.high, price),
      low: Math.min(last.low, price),
    };
    return [...candles.slice(0, -1), updated];
  }
  return [
    ...candles,
    {
      time: bucket,
      open: last.close,
      high: Math.max(last.close, price),
      low: Math.min(last.close, price),
      close: price,
      volume: 0,
    },
  ];
}

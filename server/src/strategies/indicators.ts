export function sma(values: number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) sum += values[i];
  return sum / period;
}

/** Wilder's RSI over the last `period` changes (seeded from the full series). */
export function rsi(values: number[], period: number): number | null {
  if (values.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (loss === 0) return gain === 0 ? 50 : 100;
  return 100 - 100 / (1 + gain / loss);
}

export function bollinger(values: number[], period: number, mult: number) {
  const mid = sma(values, period);
  if (mid === null) return null;
  const slice = values.slice(-period);
  const sd = Math.sqrt(slice.reduce((a, v) => a + (v - mid) ** 2, 0) / period);
  return { mid, upper: mid + mult * sd, lower: mid - mult * sd };
}

export const highest = (values: number[]) => Math.max(...values);
export const lowest = (values: number[]) => Math.min(...values);

/** Returns false for ticks that jump more than maxJumpPct from the previous good price (bad data). */
export function isSaneTick(prev: number | undefined, next: number, maxJumpPct: number): boolean {
  if (!Number.isFinite(next) || next <= 0) return false;
  if (prev === undefined || prev <= 0) return true;
  return (Math.abs(next - prev) / prev) * 100 <= maxJumpPct;
}

/** Drops candles whose close jumps beyond the threshold or whose OHLC values are inconsistent. */
export function cleanCandles<T extends { open: number; high: number; low: number; close: number }>(
  candles: T[],
  maxJumpPct: number,
): T[] {
  const out: T[] = [];
  for (const c of candles) {
    const valid = c.high >= Math.max(c.open, c.close) && c.low <= Math.min(c.open, c.close) && c.low > 0;
    if (valid && isSaneTick(out.at(-1)?.close, c.close, maxJumpPct)) out.push(c);
  }
  return out;
}

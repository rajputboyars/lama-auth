import { describe, expect, it } from 'vitest';
import { applyTick, bollingerSeries, heikinAshi, smaSeries } from './indicators';

const c = (time: number, open: number, high: number, low: number, close: number) => ({
  time,
  open,
  high,
  low,
  close,
  volume: 1,
});

describe('indicators', () => {
  const candles = [10, 11, 12, 13, 14].map((v, i) => c(i * 60_000, v, v, v, v));

  it('computes a moving average once the window is full', () => {
    const s = smaSeries(candles, 3);
    expect(s.map((p) => p.value)).toEqual([11, 12, 13]);
    expect(s[0].time).toBe(2 * 60_000);
  });

  it('bollinger bands are symmetric around the average', () => {
    const { upper, mid, lower } = bollingerSeries(candles, 3, 2);
    expect(mid.at(-1)!.value).toBe(13);
    expect(upper.at(-1)!.value - 13).toBeCloseTo(13 - lower.at(-1)!.value, 10);
  });

  it('heikin-ashi averages each bar with the previous one', () => {
    const ha = heikinAshi([c(0, 10, 12, 9, 11), c(1, 11, 14, 10, 13)]);
    expect(ha[0].close).toBe((10 + 12 + 9 + 11) / 4);
    expect(ha[0].open).toBe(10.5);
    expect(ha[1].open).toBe((ha[0].open + ha[0].close) / 2);
    expect(ha[1].high).toBe(14);
  });

  it('live ticks update the last candle or start a new one', () => {
    const base = [c(0, 10, 10, 10, 10)];
    const same = applyTick(base, 12, 30_000, '1m');
    expect(same).toHaveLength(1);
    expect(same[0]).toMatchObject({ close: 12, high: 12, low: 10 });
    const next = applyTick(same, 9, 61_000, '1m');
    expect(next).toHaveLength(2);
    expect(next[1]).toMatchObject({ time: 60_000, open: 12, close: 9, low: 9 });
  });
});

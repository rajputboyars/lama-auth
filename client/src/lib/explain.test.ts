import { describe, expect, it } from 'vitest';
import { en } from '../i18n/en';
import { hinglish } from '../i18n/hinglish';
import type { Bi, TKey } from '../i18n';
import { parseReason, renderReason } from './explain';

const fill =
  (dict: Record<string, string>) => (key: TKey, vars?: Record<string, string | number>) =>
    dict[key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars?.[k] ?? `{${k}}`));
const tEn = fill(en);
const tHi = fill(hinglish);
const pickEn = (b: Bi) => b.en;
const pickHi = (b: Bi) => b.hinglish;

// Every reason text the server writes today (strategies, Auto-Pilot, Your Pick, risk, engine).
const SERVER_REASONS: [string, TKey][] = [
  ['SMA10 crossed above SMA30', 'why.sma.up'],
  ['SMA10 crossed below SMA30', 'why.sma.down'],
  ['Uptrend, no new cross', 'why.sma.upWait'],
  ['Downtrend, no new cross', 'why.sma.downWait'],
  ['Fast period must be shorter than slow period', 'why.sma.badParams'],
  ['RSI 28.4 < 30 and price below lower band', 'why.rsi.buy'],
  ['RSI recovered to 57.1', 'why.rsi.recovered'],
  ['Price back to middle band', 'why.band.mid'],
  ['RSI 45.2', 'why.rsi.wait'],
  ['Closed above 20-period high 105.3', 'why.breakout.buy'],
  ['Closed below 10-period low 98.1', 'why.breakout.sell'],
  ['Inside range', 'why.breakout.wait'],
  ['Buy on kraken @65000, sell on binance @65300 (net 0.162%)', 'why.arb.trade'],
  [
    'Buy on kraken @65000, sell on binance @65300 (net 0.162%); filled buy kraken / sell binance',
    'why.arb.trade',
  ],
  ['Net edge 0.041% after costs < 0.3%', 'why.arb.wait'],
  ['Need quotes from at least 2 exchanges', 'why.arb.noQuotes'],
  ['Need 31 candles, have 12', 'why.needCandles'],
  ['Need 60 candles to read the market, have 40', 'why.needCandles'],
  ['Not enough candles yet', 'why.needCandlesShort'],
  [
    'Prices are climbing steadily (20-average above 50-average, up 0.42% in 10 candles)',
    'why.mood.uptrend',
  ],
  [
    'Prices are falling steadily (20-average below 50-average, down 1.10% in 10 candles)',
    'why.mood.downtrend',
  ],
  ['Prices are moving back and forth without a clear direction', 'why.mood.sideways'],
  ['Prices have gone unusually quiet (bands are among the narrowest lately)', 'why.mood.squeeze'],
  ['Signals disagree: no clear trend or range', 'why.mood.unclear'],
  ['Kill switch is ON', 'why.risk.kill'],
  ['Daily loss 3.20% hit limit 3%', 'why.risk.daily'],
  ['Max open positions (3) reached', 'why.risk.maxOpen'],
  ['No free cash', 'why.risk.cash'],
  ['Trade size too small', 'why.risk.small'],
  ['Nothing to sell', 'why.risk.nothing'],
  ['No strategy picked for this market yet', 'why.pick.none'],
];

describe('parseReason', () => {
  it.each(SERVER_REASONS)('explains "%s"', (raw, key) => {
    expect(parseReason(raw)?.key).toBe(key);
  });

  it('unwraps Auto-Pilot reasons and the strategy inside them', () => {
    const e = parseReason(
      'Market is sideways, using Rubber Band: RSI 28.4 < 30 and price below lower band',
    );
    expect(e).toMatchObject({
      key: 'why.auto.using',
      vars: { mood: 'sideways', strategy: 'Rubber Band' },
    });
    expect(e?.inner?.key).toBe('why.rsi.buy');
    expect(
      parseReason('Market is uptrend, Trend Rider waiting: Uptrend, no new cross')?.inner?.key,
    ).toBe('why.sma.upWait');
    expect(parseReason('Staying out: Prices are falling steadily (x)')?.inner?.key).toBe(
      'why.mood.downtrend',
    );
    expect(parseReason('Holding. Market is squeeze')?.key).toBe('why.auto.holding');
    expect(
      parseReason(
        'Market turned into a downtrend, selling to protect money. Prices are falling steadily',
      )?.key,
    ).toBe('why.auto.downSell');
  });

  it('unwraps Your Pick and failed orders', () => {
    expect(parseReason('Trend Rider: SMA10 crossed above SMA30')?.inner?.key).toBe('why.sma.up');
    const failed = parseReason(
      'Breakout Hunter: Closed above 20-period high 105 — FAILED: Simulated order rejection',
    );
    expect(failed?.key).toBe('why.failed');
    expect(failed?.inner?.key).toBe('why.pick');
  });

  it('returns null for text it does not know', () => {
    expect(parseReason('Something new from the server')).toBeNull();
    expect(parseReason('')).toBeNull();
  });
});

describe('renderReason', () => {
  it('writes a plain sentence, translating mood and strategy names', () => {
    const raw = 'Market is sideways, using Rubber Band: RSI 28.4 < 30 and price below lower band';
    const s = renderReason(raw, tEn, pickEn);
    expect(s).toContain('The market is sideways');
    expect(s).toContain('Rubber Band');
    expect(s).toContain('so the bot bought');
    expect(s).not.toContain('{');
    expect(renderReason(raw, tHi, pickHi)).toContain('isliye bot ne');
  });

  it('explains why a failed order failed', () => {
    const s = renderReason(
      'SMA10 crossed above SMA30 — FAILED: Simulated order rejection',
      tEn,
      pickEn,
    );
    expect(s).toContain('did not go through');
    expect(s).toContain('exchange rejected it');
    expect(s).toContain('prices started rising');
  });

  it('keeps unknown text as it is', () => {
    expect(renderReason('Brand new reason', tEn, pickEn)).toBe('Brand new reason');
  });
});

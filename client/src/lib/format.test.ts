import { describe, expect, it } from 'vitest';
import { money, pct, price, timeAgo, tone } from './format';

describe('format', () => {
  it('formats money in the wallet currency', () => {
    expect(money(1234.5, 'USD')).toBe('$1,234.50');
    expect(money(100000, 'INR')).toBe('₹1,00,000.00');
    expect(money(-5, 'USD', { sign: true })).toBe('-$5.00');
  });
  it('formats percentages with sign', () => {
    expect(pct(1.234)).toBe('+1.23%');
    expect(pct(-2)).toBe('-2.00%');
    expect(pct(null)).toBe('—');
  });
  it('adapts price precision', () => {
    expect(price(65000.123)).toBe('65,000.12');
    expect(price(0.0001234)).toBe('0.000123');
  });
  it('relative times and tones', () => {
    expect(timeAgo(0, 30_000)).toBe('30s ago');
    expect(timeAgo(0, 7_200_000)).toBe('2h ago');
    expect(tone(1)).toBe('text-win');
    expect(tone(-1)).toBe('text-loss');
  });
});

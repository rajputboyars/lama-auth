import type { Currency } from './types';

const LOCALE: Record<Currency, string> = { USD: 'en-US', INR: 'en-IN' };

export function money(
  value: number,
  currency: Currency,
  opts: { compact?: boolean; sign?: boolean } = {},
): string {
  if (!Number.isFinite(value)) return '—';
  const s = new Intl.NumberFormat(LOCALE[currency], {
    style: 'currency',
    currency,
    notation: opts.compact ? 'compact' : 'standard',
    maximumFractionDigits: opts.compact ? 1 : 2,
    signDisplay: opts.sign ? 'exceptZero' : 'auto',
  }).format(value);
  return s;
}

export function pct(value: number | null | undefined, digits = 2, sign = true): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const v = value.toFixed(digits);
  return `${sign && value > 0 ? '+' : ''}${v}%`;
}

export function price(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const digits = value >= 1000 ? 2 : value >= 1 ? 3 : 6;
  return value.toLocaleString('en-US', { maximumFractionDigits: digits });
}

export function qty(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: value >= 1 ? 4 : 8 });
}

export function timeAgo(ms: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86_400)}d ago`;
}

export const tone = (v: number) =>
  v > 0 ? 'text-win' : v < 0 ? 'text-loss' : 'text-muted-foreground';

export const MARKET_LABEL: Record<string, string> = {
  crypto: 'Crypto',
  us: 'US Stocks',
  india: 'India NSE',
  global: 'Global',
};

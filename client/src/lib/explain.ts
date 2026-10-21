import { MOOD_BY_ID, type Mood, STRATEGY_GUIDE } from '@/content/strategies';
import type { Bi, TKey } from '@/i18n';

/**
 * Turns the bot's technical reasons ("SMA10 crossed above SMA30", "RSI 28.3 < 30 and price
 * below lower band") into plain sentences. Works on the exact text the server writes, so old
 * trades are explained too. Unknown text is returned as-is by `renderReason`.
 */
export interface Explained {
  key: TKey;
  vars: Record<string, string | number>;
  /** A wrapped reason, e.g. Auto-Pilot's "using Rubber Band: <inner>". */
  inner?: Explained | null;
  /** Unparsed inner text, kept when the inner part is unknown. */
  innerRaw?: string;
}

type Rule = [RegExp, (m: RegExpMatchArray) => Explained];

const NAMES = 'Trend Rider|Rubber Band|Breakout Hunter|Bridge Runner';
const MOODS = 'uptrend|downtrend|sideways|squeeze|unclear';

const wrap = (key: TKey, vars: Explained['vars'], innerRaw: string): Explained => ({
  key,
  vars,
  inner: parseReason(innerRaw),
  innerRaw,
});

const RULES: Rule[] = [
  // Wrappers first: they contain other reasons.
  [/^(.*) — FAILED: (.*)$/s, (m) => wrap('why.failed', { why: m[2] }, m[1])],
  [
    /^Market turned into a downtrend, selling to protect money\./,
    () => ({ key: 'why.auto.downSell', vars: {} }),
  ],
  [
    new RegExp(`^Market is (${MOODS}), using (${NAMES}): (.*)$`, 's'),
    (m) => wrap('why.auto.using', { mood: m[1], strategy: m[2] }, m[3]),
  ],
  [
    new RegExp(`^Market is (${MOODS}), (${NAMES}) waiting: (.*)$`, 's'),
    (m) => wrap('why.auto.waiting', { mood: m[1], strategy: m[2] }, m[3]),
  ],
  [/^Staying out: (.*)$/s, (m) => wrap('why.auto.out', {}, m[1])],
  [
    new RegExp(`^Holding\\. Market is (${MOODS})$`),
    (m) => ({ key: 'why.auto.holding', vars: { mood: m[1] } }),
  ],
  [new RegExp(`^(${NAMES}): (.*)$`, 's'), (m) => wrap('why.pick', { strategy: m[1] }, m[2])],
  [/^No strategy picked for this market yet$/, () => ({ key: 'why.pick.none', vars: {} })],

  // Trend Rider
  [
    /^SMA(\d+) crossed above SMA(\d+)$/,
    (m) => ({ key: 'why.sma.up', vars: { fast: m[1], slow: m[2] } }),
  ],
  [
    /^SMA(\d+) crossed below SMA(\d+)$/,
    (m) => ({ key: 'why.sma.down', vars: { fast: m[1], slow: m[2] } }),
  ],
  [/^Uptrend, no new cross$/, () => ({ key: 'why.sma.upWait', vars: {} })],
  [/^Downtrend, no new cross$/, () => ({ key: 'why.sma.downWait', vars: {} })],
  [
    /^Fast period must be shorter than slow period$/,
    () => ({ key: 'why.sma.badParams', vars: {} }),
  ],

  // Rubber Band
  [
    /^RSI ([\d.]+) < ([\d.]+) and price below lower band$/,
    (m) => ({ key: 'why.rsi.buy', vars: { rsi: m[1], limit: m[2] } }),
  ],
  [/^RSI recovered to ([\d.]+)$/, (m) => ({ key: 'why.rsi.recovered', vars: { rsi: m[1] } })],
  [/^Price back to middle band$/, () => ({ key: 'why.band.mid', vars: {} })],
  [/^RSI ([\d.]+)$/, (m) => ({ key: 'why.rsi.wait', vars: { rsi: m[1] } })],

  // Breakout Hunter
  [
    /^Closed above (\d+)-period high ([\d.]+)$/,
    (m) => ({ key: 'why.breakout.buy', vars: { n: m[1], price: m[2] } }),
  ],
  [
    /^Closed below (\d+)-period low ([\d.]+)$/,
    (m) => ({ key: 'why.breakout.sell', vars: { n: m[1], price: m[2] } }),
  ],
  [/^Inside range$/, () => ({ key: 'why.breakout.wait', vars: {} })],

  // Bridge Runner (arbitrage)
  [
    /^Buy on (\S+) @([\d.]+), sell on (\S+) @([\d.]+) \(net ([-\d.]+)%\)/,
    (m) => ({ key: 'why.arb.trade', vars: { buy: m[1], sell: m[3], edge: m[5] } }),
  ],
  [
    /^Net edge ([-\d.]+)% after costs < ([\d.]+)%$/,
    (m) => ({ key: 'why.arb.wait', vars: { edge: m[1], min: m[2] } }),
  ],
  [/^Need quotes from at least 2 exchanges$/, () => ({ key: 'why.arb.noQuotes', vars: {} })],

  // Not enough history yet
  [
    /^Need (\d+) candles(?: to read the market)?, have (\d+)$/,
    (m) => ({ key: 'why.needCandles', vars: { need: m[1], have: m[2] } }),
  ],
  [/^Not enough candles yet$/, () => ({ key: 'why.needCandlesShort', vars: {} })],

  // Market mood (regime.ts)
  [/^Prices are climbing steadily/, () => ({ key: 'why.mood.uptrend', vars: {} })],
  [/^Prices are falling steadily/, () => ({ key: 'why.mood.downtrend', vars: {} })],
  [/^Prices are moving back and forth/, () => ({ key: 'why.mood.sideways', vars: {} })],
  [/^Prices have gone unusually quiet/, () => ({ key: 'why.mood.squeeze', vars: {} })],
  [/^Signals disagree/, () => ({ key: 'why.mood.unclear', vars: {} })],

  // Safety limits (riskManager.ts)
  [/^Kill switch is ON$/, () => ({ key: 'why.risk.kill', vars: {} })],
  [
    /^Daily loss ([\d.]+)% hit limit ([\d.]+)%$/,
    (m) => ({ key: 'why.risk.daily', vars: { loss: m[1], limit: m[2] } }),
  ],
  [
    /^Max open positions \((\d+)\) reached$/,
    (m) => ({ key: 'why.risk.maxOpen', vars: { n: m[1] } }),
  ],
  [/^No free cash$/, () => ({ key: 'why.risk.cash', vars: {} })],
  [/^Trade size too small$/, () => ({ key: 'why.risk.small', vars: {} })],
  [/^Nothing to sell$/, () => ({ key: 'why.risk.nothing', vars: {} })],
  [/^Simulated (?:order|leg) rejection$/, () => ({ key: 'why.risk.rejected', vars: {} })],
];

export function parseReason(raw: string | undefined | null): Explained | null {
  const text = (raw ?? '').trim();
  if (!text) return null;
  for (const [re, build] of RULES) {
    const m = text.match(re);
    if (m) return build(m);
  }
  return null;
}

const STRATEGY_BY_NAME = new Map(STRATEGY_GUIDE.map((s) => [s.name.en, s]));

type T = (key: TKey, vars?: Record<string, string | number>) => string;
type Pick = (b: Bi) => string;

/** Plain sentence for a raw reason in the current language; falls back to the raw text. */
export function renderReason(raw: string | undefined | null, t: T, pick: Pick): string {
  const e = parseReason(raw);
  return e ? render(e, t, pick) : (raw ?? '');
}

function render(e: Explained, t: T, pick: Pick): string {
  const vars: Record<string, string | number> = { ...e.vars };
  if (typeof vars.mood === 'string') {
    const info = MOOD_BY_ID.get(vars.mood as Mood);
    if (info) vars.mood = pick(info.label).toLowerCase();
  }
  if (typeof vars.strategy === 'string') {
    const g = STRATEGY_BY_NAME.get(vars.strategy);
    if (g) vars.strategy = pick(g.name);
  }
  if (e.innerRaw !== undefined)
    vars.inner = e.inner ? lowerFirst(render(e.inner, t, pick)) : e.innerRaw;
  if (e.key === 'why.failed' && typeof vars.why === 'string') {
    const why = parseReason(vars.why);
    if (why) vars.why = lowerFirst(render(why, t, pick));
  }
  return t(e.key, vars);
}

const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

import type { Bi } from '../i18n';

const b = (en: string, hinglish: string): Bi => ({ en, hinglish });

export type Mood = 'uptrend' | 'downtrend' | 'sideways' | 'squeeze' | 'unclear';

export interface MoodInfo {
  id: Mood;
  icon: string;
  label: Bi;
  meaning: Bi;
  /** Strategy id Auto-Pilot uses in this mood; null = stays out. */
  uses: string | null;
}

export const MOODS: MoodInfo[] = [
  {
    id: 'uptrend',
    icon: '📈',
    label: b('Uptrend', 'Uptrend'),
    meaning: b(
      'Prices keep making higher highs. Buyers are in control.',
      'Price lagatar naye high bana raha hai. Buyers ka control hai.',
    ),
    uses: 'trend',
  },
  {
    id: 'sideways',
    icon: '↔️',
    label: b('Sideways', 'Sideways'),
    meaning: b(
      'Prices bounce up and down inside a box with no clear direction.',
      'Price ek box ke andar upar-neeche uchhal raha hai, koi saaf disha nahi.',
    ),
    uses: 'meanrev',
  },
  {
    id: 'squeeze',
    icon: '🫧',
    label: b('Squeeze (calm before a move)', 'Squeeze (move se pehle shaanti)'),
    meaning: b(
      'Prices have gone unusually quiet. A big move often comes next.',
      'Price asaadharan roop se shaant ho gaya hai. Aksar iske baad bada move aata hai.',
    ),
    uses: 'breakout',
  },
  {
    id: 'downtrend',
    icon: '📉',
    label: b('Downtrend', 'Downtrend'),
    meaning: b(
      'Prices keep making lower lows. The bot stays out to protect your money.',
      'Price lagatar naye low bana raha hai. Paisa bachaane ke liye bot bahar rehta hai.',
    ),
    uses: null,
  },
  {
    id: 'unclear',
    icon: '🌫️',
    label: b('Unclear', 'Unclear'),
    meaning: b(
      'Not enough data, or the signals disagree. The bot waits.',
      'Data kam hai, ya signals aapas mein match nahi karte. Bot intezaar karta hai.',
    ),
    uses: null,
  },
];

export const MOOD_BY_ID = new Map(MOODS.map((m) => [m.id, m]));

export interface StrategyGuideEntry {
  id: string;
  icon: string;
  name: Bi;
  /** Plain one-line summary, used in dropdowns and cards. */
  oneLiner: Bi;
  analogy: Bi;
  buyRule: Bi;
  sellRule: Bi;
  bestMood: Mood[];
  worstWhen: Bi;
  /** Terms to link to from the guide card. */
  terms: string[];
  pattern: 'trend' | 'bounce' | 'breakout' | 'arb' | 'auto';
  /** Friendlier labels for the Settings page parameters. */
  paramLabels?: Record<string, Bi>;
}

export const STRATEGY_GUIDE: StrategyGuideEntry[] = [
  {
    id: 'auto',
    icon: '🤖',
    name: b('Bot Auto-Pilot', 'Bot Auto-Pilot'),
    oneLiner: b(
      'Reads the market mood and switches to the strategy that suits it.',
      'Market ka mood padhta hai aur us hisaab se sahi strategy pe switch karta hai.',
    ),
    analogy: b(
      'Like a driver who changes gear for the road: fast on the highway, careful in traffic, parked in a storm.',
      'Jaise driver sadak ke hisaab se gear badalta hai: highway pe tez, traffic mein dhyaan se, toofan mein gaadi park.',
    ),
    buyRule: b(
      'Uptrend → uses Trend Rider. Sideways → uses Rubber Band. Squeeze → uses Breakout Hunter. It buys only when that strategy says buy.',
      'Uptrend → Trend Rider. Sideways → Rubber Band. Squeeze → Breakout Hunter. Tabhi kharidta hai jab woh strategy buy bole.',
    ),
    sellRule: b(
      'Sells when the strategy for the current mood says sell, or as soon as the mood turns into a downtrend.',
      'Tab bechta hai jab current mood wali strategy sell bole, ya jaise hi mood downtrend ban jaaye.',
    ),
    bestMood: ['uptrend', 'sideways', 'squeeze'],
    worstWhen: b(
      'The mood flips back and forth quickly, so it keeps switching and paying costs.',
      'Mood jaldi-jaldi badalta rahe, toh yeh baar-baar switch karta hai aur kharcha bharta hai.',
    ),
    terms: ['market-mood', 'trend', 'bollinger'],
    pattern: 'auto',
  },
  {
    id: 'trend',
    icon: '🏄',
    name: b('Trend Rider', 'Trend Rider'),
    oneLiner: b(
      'Buys when a rise starts and rides it until it fades.',
      'Tezi shuru hote hi kharidta hai aur khatam hone tak saath chalta hai.',
    ),
    analogy: b(
      'Like a surfer: wait for the wave to start, ride it, jump off when it fades.',
      'Jaise surfer: lehar shuru hone ka intezaar, us pe sawaari, kamzor hote hi utar jao.',
    ),
    buyRule: b(
      'Buy when the short average (last 10 candles) moves above the long average (last 30 candles).',
      'Jab chhota average (pichhli 10 candles) lambe average (pichhli 30 candles) ke upar jaaye, tab kharido.',
    ),
    sellRule: b(
      'Sell when the short average drops back below the long average.',
      'Jab chhota average wapas lambe average ke neeche aaye, tab becho.',
    ),
    bestMood: ['uptrend'],
    worstWhen: b(
      'Sideways markets: it buys every small rise and gets stopped out again and again.',
      'Sideways market: har chhoti tezi pe kharidta hai aur baar-baar bahar ho jaata hai.',
    ),
    terms: ['sma', 'trend-following', 'trend'],
    pattern: 'trend',
    paramLabels: {
      fast: b('Short average (candles)', 'Chhota average (candles)'),
      slow: b('Long average (candles)', 'Lamba average (candles)'),
    },
  },
  {
    id: 'meanrev',
    icon: '🪀',
    name: b('Rubber Band', 'Rubber Band'),
    oneLiner: b(
      'Buys after a sharp drop, betting the price snaps back to normal.',
      'Tez girav ke baad kharidta hai, is shart pe ki price wapas normal aayega.',
    ),
    analogy: b(
      'Like a stretched rubber band: pull it too far and it tends to snap back to the middle.',
      'Jaise khincha hua rubber band: zyada kheencho toh wapas beech mein aata hai.',
    ),
    buyRule: b(
      'Buy when RSI is below 30 (fallen fast) and the price is below the lower Bollinger band (unusually low).',
      'Jab RSI 30 se neeche ho (tezi se gira) aur price lower Bollinger band ke neeche ho (asaadharan kam), tab kharido.',
    ),
    sellRule: b(
      'Sell when RSI recovers above 55, or the price is back at the middle band.',
      'Jab RSI 55 ke upar wapas aaye, ya price beech wali band pe aa jaaye, tab becho.',
    ),
    bestMood: ['sideways'],
    worstWhen: b(
      'Strong downtrends: the band keeps stretching and the price keeps falling.',
      'Strong downtrend: band khinchta rehta hai aur price girta rehta hai.',
    ),
    terms: ['mean-reversion', 'rsi', 'bollinger'],
    pattern: 'bounce',
    paramLabels: {
      rsiPeriod: b('RSI length (candles)', 'RSI length (candles)'),
      oversold: b('Buy when RSI is below', 'RSI iske neeche ho toh buy'),
      exitRsi: b('Sell when RSI is above', 'RSI iske upar ho toh sell'),
      bbPeriod: b('Band length (candles)', 'Band length (candles)'),
      bbMult: b('Band width', 'Band ki chaudai'),
    },
  },
  {
    id: 'breakout',
    icon: '🚀',
    name: b('Breakout Hunter', 'Breakout Hunter'),
    oneLiner: b(
      'Buys when the price escapes above its recent highest level.',
      'Jab price apne haal ke sabse upar wale level se bahar nikle, tab kharidta hai.',
    ),
    analogy: b(
      'Like a spring pressed down: when it finally pops above the lid, it can jump high.',
      'Jaise daba hua spring: jab dhakkan ke upar uchhalta hai, toh upar tak ja sakta hai.',
    ),
    buyRule: b(
      'Buy when a candle closes above the highest price of the last 20 candles.',
      'Jab candle pichhli 20 candles ke sabse upar wale price ke upar close ho, tab kharido.',
    ),
    sellRule: b(
      'Sell when a candle closes below the lowest price of the last 10 candles.',
      'Jab candle pichhli 10 candles ke sabse neeche wale price ke neeche close ho, tab becho.',
    ),
    bestMood: ['squeeze', 'uptrend'],
    worstWhen: b(
      'Fake breakouts: the price pokes above the line and falls straight back.',
      'Nakli breakouts: price line ke upar jhaankta hai aur seedha wapas gir jaata hai.',
    ),
    terms: ['breakout', 'breakout-level', 'volume'],
    pattern: 'breakout',
    paramLabels: {
      entryLookback: b('Buy above the high of (candles)', 'Itni candles ke high ke upar buy'),
      exitLookback: b('Sell below the low of (candles)', 'Itni candles ke low ke neeche sell'),
    },
  },
  {
    id: 'arbitrage',
    icon: '🌉',
    name: b('Bridge Runner', 'Bridge Runner'),
    oneLiner: b(
      'Buys a coin where it is cheaper and sells where it is pricier, at the same moment.',
      'Coin ko ek hi pal mein sasti jagah kharidta aur mehngi jagah bechta hai.',
    ),
    analogy: b(
      'Like buying mangoes in one market and selling them across the road where they cost more, if the walk is worth it.',
      'Jaise ek mandi se aam kharid ke saamne wali mandi mein mehnge bechna, agar chalne ka fayda ho.',
    ),
    buyRule: b(
      'Trade only when the price gap between two exchanges is bigger than all the costs plus a 0.3% safety margin.',
      'Sirf tab trade karo jab do exchanges ke price ka gap saare kharche plus 0.3% safety margin se bada ho.',
    ),
    sellRule: b(
      'Both legs happen together, so there is nothing left to sell later.',
      'Dono taraf ek saath hota hai, isliye baad mein bechne ko kuch nahi bachta.',
    ),
    bestMood: [],
    worstWhen: b(
      'Always be careful: transfer costs between exchanges are not counted here, which makes it look better than reality.',
      'Hamesha dhyaan rakho: exchanges ke beech transfer cost yahan nahi gine jaate, isliye yeh asli se behtar dikhta hai.',
    ),
    terms: ['arbitrage', 'spread', 'fees'],
    pattern: 'arb',
    paramLabels: {
      minEdgePct: b('Minimum safe gap %', 'Kam se kam safe gap %'),
    },
  },
];

export const GUIDE_BY_ID = new Map(STRATEGY_GUIDE.map((s) => [s.id, s]));

/** Strategy ids the user can pick in You vs Bot (single-venue, and not the bot itself). */
export const PICKABLE = ['trend', 'meanrev', 'breakout'];

/** Friendly display name for any strategy id, including the duel wallets. */
export function strategyName(id: string, pick: (b: Bi) => string): string {
  if (id === 'user') return pick(b('Your Pick', 'Aapki Pick'));
  const g = GUIDE_BY_ID.get(id);
  return g ? pick(g.name) : id;
}

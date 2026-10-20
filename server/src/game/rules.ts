/**
 * Gamification rewards DISCIPLINE and LEARNING only. Nothing here looks at profit,
 * trade size or trading frequency, on purpose.
 */
import type { MarketId } from '../types.js';

export type GameEvent =
  | { type: 'backtest_run'; market: MarketId; strategy: string }
  | { type: 'trade_logged' }
  | { type: 'losing_trade_reviewed' }
  | { type: 'risk_breach' }
  | { type: 'strategy_added'; strategy: string }
  /** Daily evaluation of the previous day; `walletsMaxDrawdownPct` is the worst wallet. */
  | { type: 'day_closed'; day: string; walletsMaxDrawdownPct: number; strategiesTested7d: string[] };

export const XP = {
  backtest_run: 20,
  strategy_tested_7d: 100,
  risk_clean_day: 15,
  losing_trade_reviewed: 10,
  strategy_added: 50,
  strategies_compared: 30,
} as const;

export interface Counters {
  backtestsRun: number;
  tradesLogged: number;
  lossesReviewed: number;
  riskCleanStreak: number;
  bestRiskCleanStreak: number;
  survivorStreak: number;
  bestSurvivorStreak: number;
  lastBreachDay: string | null;
  lastClosedDay: string | null;
  testedStrategies: string[];
  backtested: Partial<Record<MarketId, string[]>>;
  maxStrategiesComparedOnMarket: number;
  knownStrategies: string[];
}

export interface QuestDef {
  key: string;
  title: string;
  description: string;
  period: 'daily' | 'weekly';
  target: number;
  xp: number;
}

export interface QuestState {
  key: string;
  period: string;
  progress: number;
  target: number;
  completedAt: number | null;
  meta: Record<string, string[]>;
}

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  unlocked(c: Counters): boolean;
  progress(c: Counters): { current: number; target: number };
}

export interface GameState {
  xp: number;
  counters: Counters;
  achievements: Record<string, number>; // key -> unlockedAt
  quests: QuestState[];
}

export interface GameOutcome {
  state: GameState;
  xpGained: { amount: number; reason: string }[];
  unlocked: string[];
  questsCompleted: string[];
}

export const ACHIEVEMENTS: AchievementDef[] = [
  ach('first_backtest', 'First Backtest', 'Run your first backtest.', '🧪', (c) => c.backtestsRun, 1),
  ach('risk_guardian', 'Risk Guardian', '7 days in a row without hitting a risk limit.', '🛡️', (c) => c.bestRiskCleanStreak, 7),
  ach('honest_trader', 'Honest Trader', '50 paper trades logged with full costs.', '📒', (c) => c.tradesLogged, 50),
  ach('scientist', 'Scientist', 'Backtest 3 different strategies on the same market.', '🔬', (c) => c.maxStrategiesComparedOnMarket, 3),
  ach('survivor', 'Survivor', 'Keep max drawdown under 10% for 30 days.', '🏔️', (c) => c.bestSurvivorStreak, 30),
  ach('reflective', 'Reflective', 'Review 10 losing trades.', '🪞', (c) => c.lossesReviewed, 10),
  ach('patient', 'Patient Tester', 'Run a strategy in paper mode for 7 days.', '⏳', (c) => c.testedStrategies.length, 1),
];

function ach(key: string, name: string, description: string, icon: string, metric: (c: Counters) => number, target: number): AchievementDef {
  return {
    key,
    name,
    description,
    icon,
    unlocked: (c) => metric(c) >= target,
    progress: (c) => ({ current: Math.min(metric(c), target), target }),
  };
}

export const QUESTS: QuestDef[] = [
  { key: 'daily_backtests', title: 'Lab Rat', description: 'Run 2 backtests today.', period: 'daily', target: 2, xp: 30 },
  { key: 'daily_review', title: 'Post-Mortem', description: 'Review 1 losing trade today.', period: 'daily', target: 1, xp: 20 },
  {
    key: 'weekly_compare',
    title: 'Fair Fight',
    description: 'Backtest 2 strategies on the same market this week.',
    period: 'weekly',
    target: 2,
    xp: 60,
  },
  { key: 'weekly_discipline', title: 'Steady Hands', description: 'Finish 5 days this week without hitting a risk limit.', period: 'weekly', target: 5, xp: 80 },
];

export function emptyCounters(): Counters {
  return {
    backtestsRun: 0,
    tradesLogged: 0,
    lossesReviewed: 0,
    riskCleanStreak: 0,
    bestRiskCleanStreak: 0,
    survivorStreak: 0,
    bestSurvivorStreak: 0,
    lastBreachDay: null,
    lastClosedDay: null,
    testedStrategies: [],
    backtested: {},
    maxStrategiesComparedOnMarket: 0,
    knownStrategies: [],
  };
}

export function emptyGameState(): GameState {
  return { xp: 0, counters: emptyCounters(), achievements: {}, quests: [] };
}

/** Level n needs 100 * (n-1)^2 XP: early levels come fast, later ones need sustained practice. */
export function levelInfo(xp: number) {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
  const floor = 100 * (level - 1) ** 2;
  const next = 100 * level ** 2;
  return { level, xp, levelFloorXp: floor, nextLevelXp: next, progressPct: ((xp - floor) / (next - floor)) * 100 };
}

export const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Weeks start on Monday (UTC). */
export function weekKey(ms: number): string {
  const d = new Date(ms);
  const offset = (d.getUTCDay() + 6) % 7;
  return dayKey(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - offset));
}

export function periodKey(def: QuestDef, now: number): string {
  return def.period === 'daily' ? `d:${dayKey(now)}` : `w:${weekKey(now)}`;
}

/** Quests for the current day/week, creating fresh ones when the period rolls over. */
export function currentQuests(existing: QuestState[], now: number): QuestState[] {
  return QUESTS.map((def) => {
    const period = periodKey(def, now);
    return (
      existing.find((q) => q.key === def.key && q.period === period) ?? {
        key: def.key,
        period,
        progress: 0,
        target: def.target,
        completedAt: null,
        meta: {},
      }
    );
  });
}

export function applyEvent(prev: GameState, event: GameEvent, now: number): GameOutcome {
  const state: GameState = structuredClone(prev);
  const c = state.counters;
  const xpGained: GameOutcome['xpGained'] = [];
  const questsCompleted: string[] = [];
  const award = (amount: number, reason: string) => {
    state.xp += amount;
    xpGained.push({ amount, reason });
  };
  state.quests = currentQuests(state.quests, now);
  const quest = (key: string) => state.quests.find((q) => q.key === key)!;
  const bump = (key: string, to?: number) => {
    const q = quest(key);
    if (q.completedAt) return;
    q.progress = Math.min(q.target, to ?? q.progress + 1);
    if (q.progress >= q.target) {
      q.completedAt = now;
      const def = QUESTS.find((d) => d.key === key)!;
      award(def.xp, `Quest complete: ${def.title}`);
      questsCompleted.push(key);
    }
  };

  switch (event.type) {
    case 'backtest_run': {
      c.backtestsRun++;
      award(XP.backtest_run, 'Ran a backtest');
      const list = new Set(c.backtested[event.market] ?? []);
      const isNew = !list.has(event.strategy);
      list.add(event.strategy);
      c.backtested[event.market] = [...list];
      if (isNew && list.size >= 2) award(XP.strategies_compared, `Compared ${list.size} strategies on ${event.market}`);
      c.maxStrategiesComparedOnMarket = Math.max(c.maxStrategiesComparedOnMarket, list.size);
      bump('daily_backtests');
      const wq = quest('weekly_compare');
      const seen = new Set(wq.meta[event.market] ?? []);
      seen.add(event.strategy);
      wq.meta[event.market] = [...seen];
      bump('weekly_compare', Math.max(wq.progress, seen.size));
      break;
    }
    case 'trade_logged':
      c.tradesLogged++; // counted for the "Honest Trader" badge only; no XP per trade
      break;
    case 'losing_trade_reviewed':
      c.lossesReviewed++;
      award(XP.losing_trade_reviewed, 'Reviewed a losing trade');
      bump('daily_review');
      break;
    case 'risk_breach':
      c.lastBreachDay = dayKey(now);
      c.riskCleanStreak = 0;
      break;
    case 'strategy_added':
      if (!c.knownStrategies.includes(event.strategy)) {
        c.knownStrategies.push(event.strategy);
        award(XP.strategy_added, `New strategy in the arena: ${event.strategy}`);
      }
      break;
    case 'day_closed': {
      if (c.lastClosedDay === event.day) break; // idempotent per day
      c.lastClosedDay = event.day;
      if (c.lastBreachDay !== event.day) {
        c.riskCleanStreak++;
        c.bestRiskCleanStreak = Math.max(c.bestRiskCleanStreak, c.riskCleanStreak);
        award(XP.risk_clean_day, 'A full day within risk limits');
        bump('weekly_discipline');
      }
      if (event.walletsMaxDrawdownPct < 10) {
        c.survivorStreak++;
        c.bestSurvivorStreak = Math.max(c.bestSurvivorStreak, c.survivorStreak);
      } else {
        c.survivorStreak = 0;
      }
      for (const s of event.strategiesTested7d) {
        if (!c.testedStrategies.includes(s)) {
          c.testedStrategies.push(s);
          award(XP.strategy_tested_7d, `Tested ${s} for 7 days`);
        }
      }
      break;
    }
  }

  const unlocked: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements[a.key] && a.unlocked(c)) {
      state.achievements[a.key] = now;
      unlocked.push(a.key);
    }
  }
  return { state, xpGained, unlocked, questsCompleted };
}

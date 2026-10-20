import { describe, expect, it } from 'vitest';
import {
  XP,
  applyEvent,
  currentQuests,
  emptyGameState,
  levelInfo,
  weekKey,
} from '../src/game/rules.js';

const NOW = Date.UTC(2026, 9, 20, 12);

describe('game rules', () => {
  it('levels need increasing XP', () => {
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(100).level).toBe(2);
    expect(levelInfo(399).level).toBe(2);
    expect(levelInfo(400).level).toBe(3);
  });

  it('first backtest gives XP and unlocks First Backtest', () => {
    const out = applyEvent(
      emptyGameState(),
      { type: 'backtest_run', market: 'crypto', strategy: 'trend' },
      NOW,
    );
    expect(out.state.xp).toBe(XP.backtest_run);
    expect(out.unlocked).toContain('first_backtest');
  });

  it('trades give NO xp (we never reward trading activity)', () => {
    let s = emptyGameState();
    for (let i = 0; i < 50; i++) s = applyEvent(s, { type: 'trade_logged' }, NOW).state;
    expect(s.xp).toBe(0);
    expect(s.achievements.honest_trader).toBe(NOW);
  });

  it('comparing strategies on one market builds toward Scientist and completes the weekly quest', () => {
    let s = emptyGameState();
    for (const strategy of ['trend', 'meanrev', 'breakout']) {
      s = applyEvent(s, { type: 'backtest_run', market: 'us', strategy }, NOW).state;
    }
    expect(s.counters.maxStrategiesComparedOnMarket).toBe(3);
    expect(s.achievements.scientist).toBeDefined();
    expect(s.quests.find((q) => q.key === 'weekly_compare')!.completedAt).toBe(NOW);
    expect(s.quests.find((q) => q.key === 'daily_backtests')!.completedAt).toBe(NOW);
  });

  it('a risk breach resets the clean streak; clean days build Risk Guardian', () => {
    let s = emptyGameState();
    for (let d = 1; d <= 7; d++) {
      s = applyEvent(
        s,
        {
          type: 'day_closed',
          day: `2026-10-0${d}`,
          walletsMaxDrawdownPct: 2,
          strategiesTested7d: [],
        },
        NOW,
      ).state;
    }
    expect(s.achievements.risk_guardian).toBeDefined();
    s = applyEvent(s, { type: 'risk_breach' }, NOW).state;
    expect(s.counters.riskCleanStreak).toBe(0);
    const after = applyEvent(
      s,
      { type: 'day_closed', day: '2026-10-20', walletsMaxDrawdownPct: 2, strategiesTested7d: [] },
      NOW,
    );
    expect(after.state.counters.riskCleanStreak).toBe(0); // breach happened that day
  });

  it('day_closed is idempotent', () => {
    const ev = {
      type: 'day_closed' as const,
      day: '2026-10-19',
      walletsMaxDrawdownPct: 1,
      strategiesTested7d: ['trend@crypto'],
    };
    const once = applyEvent(emptyGameState(), ev, NOW).state;
    const twice = applyEvent(once, ev, NOW).state;
    expect(twice.xp).toBe(once.xp);
  });

  it('drawdown above 10% resets the Survivor streak', () => {
    let s = emptyGameState();
    s = applyEvent(
      s,
      { type: 'day_closed', day: 'a', walletsMaxDrawdownPct: 5, strategiesTested7d: [] },
      NOW,
    ).state;
    s = applyEvent(
      s,
      { type: 'day_closed', day: 'b', walletsMaxDrawdownPct: 12, strategiesTested7d: [] },
      NOW,
    ).state;
    expect(s.counters.survivorStreak).toBe(0);
    expect(s.counters.bestSurvivorStreak).toBe(1);
  });

  it('a new strategy rewards XP only once', () => {
    let s = applyEvent(emptyGameState(), { type: 'strategy_added', strategy: 'trend' }, NOW).state;
    s = applyEvent(s, { type: 'strategy_added', strategy: 'trend' }, NOW).state;
    expect(s.xp).toBe(XP.strategy_added);
  });

  it('quests roll over by period', () => {
    const today = currentQuests([], NOW);
    const tomorrow = currentQuests(today, NOW + 86_400_000);
    expect(tomorrow.find((q) => q.key === 'daily_review')!.period).not.toBe(
      today.find((q) => q.key === 'daily_review')!.period,
    );
    expect(weekKey(NOW)).toBe('2026-10-19'); // Monday
  });
});

import { EventEmitter } from 'node:events';
import { AchievementModel, PlayerProfileModel, QuestModel } from '../models/index.js';
import type { WalletRecord } from '../store/types.js';
import {
  ACHIEVEMENTS,
  type GameEvent,
  type GameState,
  QUESTS,
  applyEvent,
  currentQuests,
  dayKey,
  emptyCounters,
  levelInfo,
  periodKey,
} from './rules.js';

const SEVEN_DAYS = 7 * 86_400_000;

/** Loads/saves game state in MongoDB and emits game:xp / game:achievement events. */
export class GameService extends EventEmitter {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly now: () => number = Date.now) {
    super();
  }

  /** Events are applied one at a time so concurrent awards never overwrite each other. */
  record(event: GameEvent): Promise<void> {
    const run = this.queue.then(() => this.apply(event));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async apply(event: GameEvent) {
    const now = this.now();
    const state = await this.load(now);
    const out = applyEvent(state, event, now);
    await this.save(out.state);
    for (const g of out.xpGained) this.emit('game:xp', { ...g, ...levelInfo(out.state.xp) });
    for (const key of out.unlocked) {
      const def = ACHIEVEMENTS.find((a) => a.key === key)!;
      this.emit('game:achievement', {
        key,
        name: def.name,
        icon: def.icon,
        description: def.description,
      });
    }
  }

  /** Call periodically; closes yesterday once. */
  async closeDayIfNeeded(wallets: WalletRecord[]) {
    const now = this.now();
    const yesterday = dayKey(now - 86_400_000);
    const state = await this.load(now);
    if (state.counters.lastClosedDay === yesterday) return;
    await this.record({
      type: 'day_closed',
      day: yesterday,
      walletsMaxDrawdownPct: Math.max(0, ...wallets.map((w) => w.maxDrawdownPct)),
      strategiesTested7d: [
        ...new Set(
          wallets
            .filter((w) => now - w.createdAt >= SEVEN_DAYS)
            .map((w) => `${w.strategy}@${w.market}`),
        ),
      ],
    });
  }

  async load(now = this.now()): Promise<GameState> {
    const periods = [...new Set(QUESTS.map((q) => periodKey(q, now)))];
    const [profile, achievements, quests] = await Promise.all([
      PlayerProfileModel.findOne({ key: 'admin' }).lean(),
      AchievementModel.find().lean(),
      QuestModel.find({ period: { $in: periods } }).lean(),
    ]);
    return {
      xp: profile?.xp ?? 0,
      counters: { ...emptyCounters(), ...((profile?.counters as object) ?? {}) },
      achievements: Object.fromEntries(
        achievements.map((a) => [a.key as string, a.unlockedAt as number]),
      ),
      quests: currentQuests(
        quests.map((q) => ({
          key: q.key as string,
          period: q.period as string,
          progress: q.progress ?? 0,
          target: q.target as number,
          completedAt: (q.completedAt as number | undefined) ?? null,
          meta: (q.meta as Record<string, string[]>) ?? {},
        })),
        now,
      ),
    };
  }

  private async save(state: GameState) {
    await PlayerProfileModel.updateOne(
      { key: 'admin' },
      { $set: { xp: state.xp, counters: state.counters } },
      { upsert: true },
    );
    await Promise.all([
      ...Object.entries(state.achievements).map(([key, unlockedAt]) =>
        AchievementModel.updateOne(
          { key },
          { $setOnInsert: { key, unlockedAt } },
          { upsert: true },
        ),
      ),
      ...state.quests.map((q) =>
        QuestModel.updateOne({ key: q.key, period: q.period }, { $set: q }, { upsert: true }),
      ),
    ]);
  }

  async profile() {
    const state = await this.load();
    return { ...levelInfo(state.xp), counters: state.counters };
  }

  async achievements() {
    const state = await this.load();
    return ACHIEVEMENTS.map((a) => ({
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      unlockedAt: state.achievements[a.key] ?? null,
      progress: a.progress(state.counters),
    }));
  }

  async quests() {
    const state = await this.load();
    return state.quests.map((q) => {
      const def = QUESTS.find((d) => d.key === q.key)!;
      return {
        ...q,
        title: def.title,
        description: def.description,
        xp: def.xp,
        cadence: def.period,
      };
    });
  }
}

import { motion } from 'framer-motion';
import { XPBar } from '../components/XPBar';
import { Badge, ErrorNote, Panel } from '../components/ui';
import { useApi } from '../hooks/useApi';
import type { Achievement, Profile, Quest } from '../lib/types';

export function Achievements() {
  const profile = useApi<Profile>('/game/profile');
  const achievements = useApi<Achievement[]>('/game/achievements', { pollMs: 60_000 });
  const quests = useApi<Quest[]>('/game/quests', { pollMs: 60_000 });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black tracking-wide md:text-3xl">
        Achievements & Quests
      </h1>
      <ErrorNote error={achievements.error ?? quests.error} />
      <XPBar profile={profile.data} />

      <Panel title="Active quests">
        <div className="grid gap-3 md:grid-cols-2">
          {(quests.data ?? []).map((q) => {
            const done = !!q.completedAt;
            return (
              <div
                key={q.key}
                className={`rounded-xl border p-3 ${done ? 'border-win/50 bg-win/5' : 'border-edge bg-void/40'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{q.title}</span>
                  <div className="flex gap-1">
                    <Badge tone={q.cadence === 'daily' ? 'cyan' : 'pink'}>{q.cadence}</Badge>
                    <Badge tone="amber">+{q.xp} XP</Badge>
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-400">{q.description}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-void">
                  <motion.div
                    className={done ? 'h-full bg-win' : 'h-full bg-neon-cyan'}
                    initial={{ width: 0 }}
                    animate={{ width: `${(q.progress / q.target) * 100}%` }}
                  />
                </div>
                <div className="num mt-1 text-right text-[11px] text-slate-500">
                  {done ? 'Complete ✓' : `${q.progress} / ${q.target}`}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Badges">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(achievements.data ?? []).map((a, i) => {
            const unlocked = !!a.unlockedAt;
            return (
              <motion.div
                key={a.key}
                initial={{ opacity: 0, rotateY: 90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-2xl border p-4 text-center ${unlocked ? 'border-neon-pink/60 bg-neon-pink/5 shadow-glow-pink' : 'border-edge opacity-60 grayscale'}`}
              >
                <div className="text-4xl" aria-hidden>
                  {a.icon}
                </div>
                <div className="mt-2 font-display text-sm font-bold">{a.name}</div>
                <p className="mt-1 text-[11px] text-slate-400">{a.description}</p>
                <div className="num mt-2 text-[11px] text-slate-500">
                  {unlocked
                    ? `Unlocked ${new Date(a.unlockedAt!).toLocaleDateString()}`
                    : `${a.progress.current} / ${a.progress.target}`}
                </div>
              </motion.div>
            );
          })}
        </div>
      </Panel>
      <p className="text-xs text-slate-500">
        XP comes from learning and discipline: backtesting, comparing strategies, reviewing losses,
        testing for a full week and staying within risk limits. Profit, trade size and trade count
        never earn XP.
      </p>
    </div>
  );
}

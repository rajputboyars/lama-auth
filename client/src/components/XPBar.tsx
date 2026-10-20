import { motion } from 'framer-motion';
import type { Profile } from '../lib/types';

export function XPBar({ profile }: { profile: Profile | null }) {
  const pct = Math.max(0, Math.min(100, profile?.progressPct ?? 0));
  return (
    <div className="panel flex items-center gap-4">
      <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-neon-violet/50 bg-neon-violet/10 shadow-glow-pink">
        <span className="font-display text-2xl font-black text-neon-violet">
          {profile?.level ?? '–'}
        </span>
        <span className="absolute -bottom-2 rounded bg-void px-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
          Level
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <span className="label">Discipline XP</span>
          <span className="num text-xs text-slate-400">
            {profile ? `${profile.xp} / ${profile.nextLevelXp}` : '…'}
          </span>
        </div>
        <div
          className="mt-2 h-3 overflow-hidden rounded-full border border-edge bg-void"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-neon-cyan via-neon-violet to-neon-pink"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          Earned by backtesting, reviewing losses and respecting risk limits — never by profit.
        </p>
      </div>
    </div>
  );
}

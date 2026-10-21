import { motion } from 'framer-motion';
import { Term } from '@/components/Term';
import { useLang } from '@/i18n';
import type { Profile } from '@/lib/types';

export function XPBar({ profile }: { profile: Profile | null }) {
  const { t } = useLang();
  const pct = Math.max(0, Math.min(100, profile?.progressPct ?? 0));
  return (
    <div className="panel flex items-center gap-4">
      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-soft">
        <div className="text-center leading-none">
          <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
            {t('xp.level')}
          </div>
          <div className="font-display text-2xl font-extrabold">{profile?.level ?? '–'}</div>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">
            <Term id="xp">{t('xp.title')}</Term>
          </span>
          <span className="num text-xs text-muted-foreground">
            {profile ? `${profile.xp} / ${profile.nextLevelXp} XP` : '…'}
          </span>
        </div>
        <div
          className="mt-2 h-3 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-win"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{t('xp.hint')}</p>
      </div>
    </div>
  );
}

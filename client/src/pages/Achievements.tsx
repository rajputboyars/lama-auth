import { motion } from 'framer-motion';
import { XPBar } from '@/components/XPBar';
import { Badge, ErrorNote, Note, PageHeader, Panel } from '@/components/common';
import { useApi } from '@/hooks/useApi';
import { useLang } from '@/i18n';
import type { Achievement, Profile, Quest } from '@/lib/types';
import { cn } from '@/lib/utils';

export function Achievements() {
  const { t } = useLang();
  const profile = useApi<Profile>('/game/profile');
  const achievements = useApi<Achievement[]>('/game/achievements', { pollMs: 60_000 });
  const quests = useApi<Quest[]>('/game/quests', { pollMs: 60_000 });

  return (
    <div className="space-y-6">
      <PageHeader title={t('rewards.title')} intro={t('rewards.intro')} />
      <ErrorNote error={achievements.error ?? quests.error} />
      <XPBar profile={profile.data} />

      <Panel title={t('rewards.quests')} hint={t('rewards.questsHint')}>
        <div className="grid gap-3 md:grid-cols-2">
          {(quests.data ?? []).map((q) => {
            const done = !!q.completedAt;
            return (
              <div
                key={q.key}
                className={cn(
                  'rounded-2xl border p-4',
                  done ? 'border-win/40 bg-win/5' : 'bg-background',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{q.title}</span>
                  <div className="flex gap-1">
                    <Badge tone={q.cadence === 'daily' ? 'cyan' : 'slate'}>
                      {q.cadence === 'daily' ? t('rewards.daily') : t('rewards.weekly')}
                    </Badge>
                    <Badge tone="amber">+{q.xp} XP</Badge>
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{q.description}</p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className={done ? 'h-full bg-win' : 'h-full bg-primary'}
                    initial={{ width: 0 }}
                    animate={{ width: `${(q.progress / q.target) * 100}%` }}
                  />
                </div>
                <div className="num mt-1 text-right text-xs text-muted-foreground">
                  {done ? t('rewards.complete') : `${q.progress} / ${q.target}`}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title={t('rewards.badges')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(achievements.data ?? []).map((a, i) => {
            const unlocked = !!a.unlockedAt;
            return (
              <motion.div
                key={a.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  'rounded-2xl border p-4 text-center',
                  unlocked ? 'border-primary/30 bg-primary/5' : 'opacity-60 grayscale',
                )}
              >
                <div className="text-4xl" aria-hidden>
                  {a.icon}
                </div>
                <div className="mt-2 font-display text-sm font-bold">{a.name}</div>
                <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                <div className="num mt-2 text-xs text-muted-foreground">
                  {unlocked
                    ? t('rewards.unlocked', { date: new Date(a.unlockedAt!).toLocaleDateString() })
                    : `${a.progress.current} / ${a.progress.target}`}
                </div>
              </motion.div>
            );
          })}
        </div>
      </Panel>
      <Note>
        <p>{t('rewards.footer')}</p>
      </Note>
    </div>
  );
}

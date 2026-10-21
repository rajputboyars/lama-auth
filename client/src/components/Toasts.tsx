import { AnimatePresence, motion } from 'framer-motion';
import { useLive } from '@/hooks/live';
import { cn } from '@/lib/utils';
import { Confetti } from './Confetti';

export function Toasts() {
  const { toasts, dismiss } = useLive();
  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col items-end gap-2 md:bottom-6"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            onClick={() => dismiss(t.id)}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            className={cn(
              'pointer-events-auto relative w-full max-w-sm rounded-3xl bg-popover p-4 text-left shadow-lift',
              t.kind === 'achievement' && 'border-primary/40',
              t.kind === 'error' && 'border-loss/40',
            )}
          >
            {t.kind !== 'error' && <Confetti pieces={t.kind === 'achievement' ? 28 : 14} />}
            <div className="flex items-center gap-3">
              <span className="text-2xl">{t.icon ?? (t.kind === 'xp' ? '✨' : '⚠️')}</span>
              <div>
                <div className="font-display text-sm font-bold">{t.title}</div>
                {t.body && <div className="text-xs text-muted-foreground">{t.body}</div>}
              </div>
            </div>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

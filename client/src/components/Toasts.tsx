import { AnimatePresence, motion } from 'framer-motion';
import { useLive } from '../hooks/live';

export function Toasts() {
  const { toasts, dismiss } = useLive();
  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-end gap-2 md:bottom-6"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            onClick={() => dismiss(t.id)}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            className={`pointer-events-auto w-full max-w-sm rounded-2xl border bg-panel/95 p-3 text-left backdrop-blur ${
              t.kind === 'achievement'
                ? 'border-neon-pink/60 shadow-glow-pink'
                : t.kind === 'error'
                  ? 'border-loss/60'
                  : 'border-neon-violet/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{t.icon ?? (t.kind === 'xp' ? '✨' : '⚠️')}</span>
              <div>
                <div className="font-display text-sm font-bold">{t.title}</div>
                {t.body && <div className="text-xs text-slate-400">{t.body}</div>}
              </div>
            </div>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

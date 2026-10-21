import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/** Circular XP progress with the level number in the middle. */
export function LevelRing({
  level,
  progressPct,
  size = 56,
  className,
}: {
  level: number | undefined;
  progressPct: number;
  size?: number;
  className?: string;
}) {
  const stroke = Math.max(4, size / 11);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, progressPct));
  return (
    <div
      className={cn(
        'relative grid shrink-0 place-items-center rounded-full bg-card shadow-soft',
        className,
      )}
      style={{ width: size + 10, height: size + 10 }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="fill-none stroke-background"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          className="fill-none stroke-primary"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute font-display font-extrabold" style={{ fontSize: size * 0.34 }}>
        {level ?? '–'}
      </span>
    </div>
  );
}

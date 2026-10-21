import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

const COLORS = ['bg-c-coral', 'bg-c-teal', 'bg-c-green', 'bg-c-violet', 'bg-c-indigo', 'bg-warn'];

/** A one-off burst of colourful pieces, for unlocked badges and earned XP. */
export function Confetti({ pieces = 18 }: { pieces?: number }) {
  const reduce = useReducedMotion();
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        const angle = (i / pieces) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 50 + Math.random() * 60;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 30,
          rotate: Math.random() * 360,
          color: COLORS[i % COLORS.length],
          round: i % 3 === 0,
        };
      }),
    [pieces],
  );
  if (reduce) return null;
  return (
    <span className="pointer-events-none absolute left-8 top-1/2" aria-hidden>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className={`absolute block h-2 w-2 ${b.round ? 'rounded-full' : 'rounded-sm'} ${b.color}`}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
          animate={{ x: b.x, y: b.y + 40, opacity: 0, scale: 1, rotate: b.rotate }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      ))}
    </span>
  );
}

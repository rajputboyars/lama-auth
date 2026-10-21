import { animate, useMotionValue, useMotionValueEvent } from 'framer-motion';
import { useEffect, useState } from 'react';
import { money } from '@/lib/format';
import type { Currency } from '@/lib/types';

/** A money amount that counts smoothly to its new value whenever it changes. */
export function AnimatedMoney({
  value,
  currency,
  sign = false,
  className,
}: {
  value: number;
  currency: Currency;
  sign?: boolean;
  className?: string;
}) {
  const mv = useMotionValue(value);
  const [shown, setShown] = useState(value);
  useMotionValueEvent(mv, 'change', setShown);
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.8, ease: 'easeOut' });
    return () => controls.stop();
  }, [mv, value]);
  return <span className={className}>{money(shown, currency, { sign })}</span>;
}

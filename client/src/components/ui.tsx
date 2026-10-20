import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function Panel({
  title,
  action,
  children,
  className = '',
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`panel ${className}`}
    >
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="label">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </motion.section>
  );
}

export function Stat({
  label,
  value,
  sub,
  valueClass = '',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="panel">
      <div className="label">{label}</div>
      <div className={`num mt-1 text-2xl font-semibold ${valueClass}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function LiveDot({ on, label }: { on: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold">
      <span className="relative inline-flex h-2.5 w-2.5">
        {on && <span className="absolute inset-0 animate-pulseDot rounded-full bg-win" />}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${on ? 'bg-win shadow-glow-win' : 'bg-slate-600'}`}
        />
      </span>
      {label && <span className={on ? 'text-win' : 'text-slate-400'}>{label}</span>}
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange(v: boolean): void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition disabled:opacity-40 ${checked ? 'border-neon-cyan bg-neon-cyan/30 shadow-glow' : 'border-edge bg-void'}`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`absolute top-0.5 h-4 w-4 rounded-full ${checked ? 'right-0.5 bg-neon-cyan' : 'left-0.5 bg-slate-500'}`}
      />
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-8 text-center text-sm text-slate-500">{children}</div>;
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
      {error}
    </div>
  );
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'win' | 'loss' | 'cyan' | 'pink' | 'amber';
}) {
  const tones = {
    slate: 'border-edge text-slate-300',
    win: 'border-win/40 text-win bg-win/10',
    loss: 'border-loss/40 text-loss bg-loss/10',
    cyan: 'border-neon-cyan/40 text-neon-cyan bg-neon-cyan/10',
    pink: 'border-neon-pink/40 text-neon-pink bg-neon-pink/10',
    amber: 'border-amber-400/40 text-amber-300 bg-amber-400/10',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function PaperBanner() {
  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
      <strong>Paper trading only.</strong> Fake money, real prices, realistic costs. Results here do
      not mean a strategy is profitable.
    </div>
  );
}

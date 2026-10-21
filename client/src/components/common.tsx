import { motion } from 'framer-motion';
import { TriangleAlert, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge as UiBadge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useLang } from '@/i18n';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  intro,
  action,
}: {
  title: ReactNode;
  intro?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-wrap items-end justify-between gap-4"
    >
      <div className="space-y-2">
        <h1 className="page-title">{title}</h1>
        {intro && <p className="page-intro">{intro}</p>}
      </div>
      {action}
    </motion.header>
  );
}

export function Panel({
  title,
  hint,
  action,
  children,
  className = '',
}: {
  title?: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn('panel', className)}
    >
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            {title && <h2 className="font-display text-lg font-bold">{title}</h2>}
            {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
          </div>
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
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="panel">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className={cn('num mt-1.5 text-2xl font-bold tracking-tight', valueClass)}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function LiveDot({ on, label }: { on: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold">
      <span className="relative inline-flex h-2.5 w-2.5">
        {on && <span className="absolute inset-0 animate-pulseDot rounded-full bg-win" />}
        <span
          className={cn(
            'relative inline-flex h-2.5 w-2.5 rounded-full',
            on ? 'bg-win' : 'bg-muted-foreground/50',
          )}
        />
      </span>
      {label && <span className={on ? 'text-win' : 'text-muted-foreground'}>{label}</span>}
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
    <Switch checked={checked} onCheckedChange={onChange} aria-label={label} disabled={disabled} />
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="neu-inset rounded-3xl py-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-loss/30 bg-loss/10 px-3 py-2 text-sm text-loss">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      {error}
    </div>
  );
}

export function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm',
        tone === 'warn'
          ? 'border-warn/30 bg-warn/10 text-foreground'
          : 'border-primary/20 bg-primary/5 text-foreground',
      )}
    >
      {tone === 'warn' ? (
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

const TONE = {
  slate: 'secondary',
  win: 'win',
  loss: 'loss',
  cyan: 'info',
  pink: 'info',
  amber: 'warn',
} as const;

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: keyof typeof TONE;
}) {
  return <UiBadge variant={TONE[tone]}>{children}</UiBadge>;
}

export function PaperBanner() {
  const { t } = useLang();
  return (
    <Note tone="warn">
      <p>
        <strong>{t('paper.title')}</strong> {t('paper.body')}
      </p>
    </Note>
  );
}

import { motion } from 'framer-motion';
import { CircleCheck } from 'lucide-react';
import { type PresetId, RISK_PRESETS, presetOf } from '@/content/riskPresets';
import { useLang } from '@/i18n';
import type { RiskConfig } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Three big cards: Careful, Balanced, Bold. Shows "Custom" when the numbers were hand-edited. */
export function RiskPresetPicker({
  risk,
  onPick,
  disabled,
}: {
  risk: RiskConfig;
  onPick(next: RiskConfig, id: PresetId): void;
  disabled?: boolean;
}) {
  const { t, pick } = useLang();
  const current = presetOf(risk);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {RISK_PRESETS.map((p) => {
          const active = current === p.id;
          return (
            <motion.button
              key={p.id}
              type="button"
              disabled={disabled}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPick({ ...risk, ...p.risk }, p.id)}
              aria-pressed={active}
              className={cn(
                'relative flex flex-col gap-2 rounded-3xl p-4 text-left transition disabled:opacity-50',
                active
                  ? 'bg-background shadow-neu-inset ring-2 ring-primary/50'
                  : 'bg-card shadow-soft hover:-translate-y-0.5',
              )}
            >
              {active && <CircleCheck className="absolute right-3 top-3 h-5 w-5 text-primary" />}
              <span className="text-3xl" aria-hidden>
                {p.icon}
              </span>
              <span className="font-display text-lg font-bold">{pick(p.name)}</span>
              <span className="text-sm leading-snug text-muted-foreground">{pick(p.summary)}</span>
            </motion.button>
          );
        })}
      </div>
      {current === 'custom' && (
        <p className="text-sm text-muted-foreground">{t('preset.custom')}</p>
      )}
    </div>
  );
}

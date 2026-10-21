import { useState } from 'react';
import { useMode } from '@/hooks/mode';
import { useLang } from '@/i18n';
import { parseReason, renderReason } from '@/lib/explain';
import { cn } from '@/lib/utils';

/**
 * The bot's reason for a decision in plain words. The original technical text is one click
 * away (always shown in Expert mode), so nothing is hidden from people who want it.
 */
export function Reason({ text, className }: { text: string; className?: string }) {
  const { t, pick } = useLang();
  const { simple } = useMode();
  const [open, setOpen] = useState(false);
  const known = parseReason(text) !== null;
  const friendly = renderReason(text, t, pick);
  const showRaw = known && (!simple || open);

  return (
    <span className={cn('block', className)}>
      <span className="block">{friendly}</span>
      {showRaw && <span className="num mt-1 block text-[11px] opacity-70">{text}</span>}
      {known && simple && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="mt-1 text-[11px] font-semibold text-primary hover:underline"
        >
          {open ? t('reason.hide') : t('reason.details')}
        </button>
      )}
    </span>
  );
}

import { BookOpen } from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TERM_BY_ID } from '@/content/glossary';
import { useLang } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * A word with a dotted underline. Hover (or tap) shows its one-line meaning and a link
 * to the full explanation on the Terms page.
 */
export function Term({
  id,
  children,
  className,
}: {
  id: string;
  children?: ReactNode;
  className?: string;
}) {
  const { pick, t } = useLang();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const term = TERM_BY_ID.get(id);
  if (!term) return <>{children}</>;

  const hover = (v: boolean) => (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(v), v ? 250 : 150);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onPointerEnter={hover(true)}
          onPointerLeave={hover(false)}
          className={cn(
            'cursor-help underline decoration-primary/50 decoration-dotted underline-offset-4 hover:decoration-primary',
            className,
          )}
        >
          {children ?? pick(term.term)}
        </button>
      </PopoverTrigger>
      <PopoverContent
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
        className="text-left"
      >
        <div className="font-display text-sm font-bold">{pick(term.term)}</div>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{pick(term.short)}</p>
        <Link
          to={`/learn/terms#${term.id}`}
          onClick={() => setOpen(false)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <BookOpen className="h-3.5 w-3.5" />
          {t('term.learnMore')}
        </Link>
      </PopoverContent>
    </Popover>
  );
}

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Lightbulb, Search, Target } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Empty, PageHeader } from '@/components/common';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CATEGORIES, GLOSSARY, type GlossaryCategory, TERM_BY_ID } from '@/content/glossary';
import { useLang } from '@/i18n';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Glossary() {
  const { t, pick } = useLang();
  const { hash } = useLocation();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<GlossaryCategory | 'all'>('all');
  const [open, setOpen] = useState<string[]>([]);
  const root = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      GLOSSARY.filter(
        (x) =>
          (category === 'all' || x.category === category) &&
          (!q ||
            [x.term, x.short, x.detail].some(
              (b) => b.en.toLowerCase().includes(q) || b.hinglish.toLowerCase().includes(q),
            )),
      ),
    [q, category],
  );

  // Deep link: /learn/terms#slippage opens and scrolls to that term.
  useEffect(() => {
    const id = decodeURIComponent(hash.replace('#', ''));
    if (!id || !TERM_BY_ID.has(id)) return;
    setQuery('');
    setCategory('all');
    setOpen((o) => (o.includes(id) ? o : [...o, id]));
    const timer = setTimeout(
      () =>
        document
          .getElementById(`term-${id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      80,
    );
    return () => clearTimeout(timer);
  }, [hash]);

  // Scroll reveal for each category block.
  useLayoutEffect(() => {
    if (!root.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 24,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
      });
    }, root);
    return () => ctx.revert();
  }, [visible.length, category]);

  // Opening or closing terms moves everything below; re-measure once the accordion settles.
  useEffect(() => {
    const timer = setTimeout(() => ScrollTrigger.refresh(), 250);
    return () => clearTimeout(timer);
  }, [open]);

  const groups = CATEGORIES.map((c) => ({
    ...c,
    terms: visible.filter((x) => x.category === c.id),
  })).filter((g) => g.terms.length > 0);

  return (
    <div className="space-y-6" ref={root}>
      <PageHeader title={t('terms.title')} intro={t('terms.intro', { n: GLOSSARY.length })} />

      <div className="sticky top-[57px] z-20 -mx-4 space-y-3 border-b bg-background/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('terms.search')}
            className="pl-9"
            aria-label={t('terms.search')}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <Chip active={category === 'all'} onClick={() => setCategory('all')}>
            {t('terms.all')}
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
              <span aria-hidden>{c.icon}</span> {pick(c.label)}
            </Chip>
          ))}
        </div>
      </div>

      {groups.length === 0 && <Empty>{t('terms.none', { q: query })}</Empty>}

      {groups.map((g) => (
        <section key={g.id} data-reveal className="space-y-2">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold">
            <span aria-hidden>{g.icon}</span> {pick(g.label)}
            <span className="text-sm font-normal text-muted-foreground">({g.terms.length})</span>
          </h2>
          <Accordion type="multiple" value={open} onValueChange={setOpen} className="panel py-1">
            {g.terms.map((x) => (
              <AccordionItem
                key={x.id}
                value={x.id}
                id={`term-${x.id}`}
                className="scroll-mt-40 last:border-0"
              >
                <AccordionTrigger className="text-base">
                  <span className="space-y-0.5">
                    <span className="block font-display font-bold">{pick(x.term)}</span>
                    <span className="block text-sm font-normal text-muted-foreground">
                      {pick(x.short)}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <p className="leading-relaxed">{pick(x.detail)}</p>
                  <div className="rounded-xl bg-primary/5 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                      <Lightbulb className="h-3.5 w-3.5" /> {t('terms.example')}
                    </div>
                    <p className="leading-relaxed">{pick(x.example)}</p>
                  </div>
                  <div className="rounded-xl bg-win/5 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-win">
                      <Target className="h-3.5 w-3.5" /> {t('terms.why')}
                    </div>
                    <p className="leading-relaxed">{pick(x.why)}</p>
                  </div>
                  {x.related.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">{t('terms.related')}</span>
                      {x.related
                        .map((id) => TERM_BY_ID.get(id))
                        .filter((r) => r !== undefined)
                        .map((r) => (
                          <Link key={r.id} to={{ hash: r.id }}>
                            <Badge variant="info" className="cursor-pointer hover:bg-primary/20">
                              {pick(r.term)}
                            </Badge>
                          </Link>
                        ))}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick(): void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpen, Play, Swords, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { type PresetId, RISK_PRESETS, presetOf } from '@/content/riskPresets';
import { GUIDE_BY_ID, PICKABLE } from '@/content/strategies';
import { useApi } from '@/hooks/useApi';
import { useLive } from '@/hooks/live';
import { useWizard } from '@/hooks/wizard';
import { type TKey, useLang } from '@/i18n';
import { api } from '@/lib/api';
import { MARKET_LABEL } from '@/lib/format';
import type { BotStatus, DuelMarket, MarketId, Settings } from '@/lib/types';
import { cn } from '@/lib/utils';
import { RiskPresetPicker } from './RiskPresetPicker';
import { ErrorNote } from './common';

const STEPS = ['welcome', 'markets', 'strategy', 'safety', 'ready'] as const;
const MARKETS: MarketId[] = ['crypto', 'us', 'india', 'global'];
const ICON: Record<MarketId, string> = { crypto: '₿', us: '🇺🇸', india: '🇮🇳', global: '🌐' };

/** Five short steps that set up a first-time user and start the bot. */
export function SetupWizard() {
  const { open, closeWizard } = useWizard();
  const { t, pick } = useLang();
  const { setStatus } = useLive();
  const navigate = useNavigate();
  const settings = useApi<Settings>(open ? '/settings' : null);
  const duel = useApi<DuelMarket[]>(open ? '/duel' : null);

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [markets, setMarkets] = useState<Record<MarketId, boolean>>({
    crypto: true,
    us: true,
    india: true,
    global: true,
  });
  const [strategy, setStrategy] = useState('trend');
  const [preset, setPreset] = useState<PresetId>('balanced');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start from what is saved now, so running the wizard again does not undo earlier choices.
  useEffect(() => {
    const s = settings.data;
    if (!s) return;
    setMarkets(
      Object.fromEntries(MARKETS.map((m) => [m, s.markets[m]?.enabled ?? true])) as Record<
        MarketId,
        boolean
      >,
    );
    const p = presetOf(s.risk);
    if (p !== 'custom') setPreset(p);
  }, [settings.data]);
  useEffect(() => {
    const first = duel.data?.find((d) => d.market === 'crypto') ?? duel.data?.[0];
    if (first) setStrategy(first.userStrategy);
  }, [duel.data]);
  useEffect(() => {
    if (open) {
      setStep(0);
      setError(null);
    }
  }, [open]);

  const go = (d: number) => {
    setDir(d);
    setStep((s) => Math.max(0, Math.min(STEPS.length - 1, s + d)));
  };

  async function finish(start: boolean) {
    setBusy(true);
    setError(null);
    try {
      const risk = {
        ...(settings.data?.risk ?? {}),
        ...RISK_PRESETS.find((p) => p.id === preset)!.risk,
      };
      await api('/settings', {
        method: 'PUT',
        body: {
          markets: Object.fromEntries(MARKETS.map((m) => [m, { enabled: markets[m] }])),
          risk,
        },
      });
      for (const m of MARKETS)
        await api(`/duel/${m}`, { method: 'PUT', body: { userStrategy: strategy } });
      if (start) setStatus(await api<BotStatus>('/bot/start', { method: 'POST' }));
      closeWizard();
      navigate(start ? '/vs' : '/');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const id = STEPS[step];
  const noMarket = !MARKETS.some((m) => markets[m]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeWizard()}>
      <DialogContent className="max-w-2xl">
        <div className="mb-5 flex items-center gap-2" aria-hidden>
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={cn(
                'h-2 rounded-full transition-all',
                i === step
                  ? 'w-8 bg-primary'
                  : i < step
                    ? 'w-2 bg-primary/60'
                    : 'w-2 bg-muted-foreground/25',
              )}
            />
          ))}
          <span className="ml-auto text-xs font-semibold text-muted-foreground">
            {t('wiz.step', { n: step + 1, total: STEPS.length })}
          </span>
        </div>

        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={id}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="space-y-5"
          >
            {id === 'welcome' && (
              <>
                <div className="text-5xl" aria-hidden>
                  👋
                </div>
                <DialogTitle>{t('wiz.welcome.title')}</DialogTitle>
                <DialogDescription>{t('wiz.welcome.body')}</DialogDescription>
                <ul className="space-y-2.5">
                  {(['wiz.welcome.p1', 'wiz.welcome.p2', 'wiz.welcome.p3'] as TKey[]).map(
                    (k, i) => (
                      <li
                        key={k}
                        className="neu-inset flex items-start gap-3 rounded-2xl px-4 py-3 text-sm"
                      >
                        <span className="text-xl" aria-hidden>
                          {['💸', '🤖', '🎓'][i]}
                        </span>
                        {t(k)}
                      </li>
                    ),
                  )}
                </ul>
              </>
            )}

            {id === 'markets' && (
              <>
                <DialogTitle>{t('wiz.markets.title')}</DialogTitle>
                <DialogDescription>{t('wiz.markets.body')}</DialogDescription>
                <div className="grid gap-3 sm:grid-cols-2">
                  {MARKETS.map((m) => (
                    <label
                      key={m}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-3xl p-4 transition',
                        markets[m] ? 'bg-card shadow-soft' : 'neu-inset opacity-70',
                      )}
                    >
                      <span className="text-2xl" aria-hidden>
                        {ICON[m]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-semibold">
                          {MARKET_LABEL[m]}
                          {m === 'crypto' && (
                            <span className="rounded-full bg-win/15 px-2 py-0.5 text-[10px] font-bold text-win">
                              {t('wiz.markets.best')}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {t(`markets.about.${m}` as TKey)}
                        </span>
                      </span>
                      <Switch
                        checked={markets[m]}
                        onCheckedChange={(v) => setMarkets((x) => ({ ...x, [m]: v }))}
                        aria-label={MARKET_LABEL[m]}
                      />
                    </label>
                  ))}
                </div>
                {noMarket && <ErrorNote error={t('wiz.markets.none')} />}
              </>
            )}

            {id === 'strategy' && (
              <>
                <DialogTitle>{t('wiz.strategy.title')}</DialogTitle>
                <DialogDescription>{t('wiz.strategy.body')}</DialogDescription>
                <div className="grid gap-3">
                  {PICKABLE.map((sid) => {
                    const g = GUIDE_BY_ID.get(sid)!;
                    const active = strategy === sid;
                    return (
                      <button
                        key={sid}
                        type="button"
                        onClick={() => setStrategy(sid)}
                        aria-pressed={active}
                        className={cn(
                          'flex items-start gap-3 rounded-3xl p-4 text-left transition',
                          active
                            ? 'bg-background shadow-neu-inset ring-2 ring-primary/50'
                            : 'bg-card shadow-soft hover:-translate-y-0.5',
                        )}
                      >
                        <span className="text-3xl" aria-hidden>
                          {g.icon}
                        </span>
                        <span>
                          <span className="block font-display text-lg font-bold">
                            {pick(g.name)}
                          </span>
                          <span className="block text-sm text-muted-foreground">
                            {pick(g.oneLiner)}
                          </span>
                          <span className="mt-1 block text-xs italic text-muted-foreground">
                            “{pick(g.analogy)}”
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Swords className="h-4 w-4 text-primary" /> {t('wiz.strategy.race')}
                </p>
              </>
            )}

            {id === 'safety' && (
              <>
                <DialogTitle>{t('wiz.safety.title')}</DialogTitle>
                <DialogDescription>{t('wiz.safety.body')}</DialogDescription>
                {settings.data && (
                  <RiskPresetPicker
                    risk={{
                      ...settings.data.risk,
                      ...RISK_PRESETS.find((p) => p.id === preset)!.risk,
                    }}
                    onPick={(_, p) => setPreset(p)}
                  />
                )}
              </>
            )}

            {id === 'ready' && (
              <>
                <div className="text-5xl" aria-hidden>
                  🚀
                </div>
                <DialogTitle>{t('wiz.ready.title')}</DialogTitle>
                <DialogDescription>{t('wiz.ready.body')}</DialogDescription>
                <ul className="space-y-2.5">
                  {[
                    { icon: Wallet, k: 'wiz.ready.tip1' as TKey },
                    { icon: Swords, k: 'wiz.ready.tip2' as TKey },
                    { icon: BookOpen, k: 'wiz.ready.tip3' as TKey },
                  ].map(({ icon: Icon, k }) => (
                    <li
                      key={k}
                      className="neu-inset flex items-start gap-3 rounded-2xl px-4 py-3 text-sm"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {t(k)}
                    </li>
                  ))}
                </ul>
                <ErrorNote error={error} />
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {step === 0 ? (
            <Button variant="ghost" onClick={closeWizard}>
              {t('wiz.later')}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => go(-1)} disabled={busy}>
              <ArrowLeft /> {t('wiz.back')}
            </Button>
          )}
          {id !== 'ready' ? (
            <Button onClick={() => go(1)} disabled={id === 'markets' && noMarket}>
              {step === 0 ? t('wiz.begin') : t('wiz.next')} <ArrowRight />
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void finish(false)} disabled={busy}>
                {t('wiz.finish')}
              </Button>
              <Button variant="win" size="lg" onClick={() => void finish(true)} disabled={busy}>
                <Play /> {busy ? t('common.wait') : t('wiz.start')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

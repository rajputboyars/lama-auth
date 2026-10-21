import { Play, Square } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLive } from '@/hooks/live';
import { type TKey, useLang } from '@/i18n';
import { api } from '@/lib/api';
import { MARKET_LABEL } from '@/lib/format';
import type { BotStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ErrorNote, LiveDot } from './common';

export function BotControls({ compact = false }: { compact?: boolean }) {
  const { status, setStatus } = useLive();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = !!status?.running;

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      setStatus(await api<BotStatus>(running ? '/bot/stop' : '/bot/start', { method: 'POST' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const button = (
    <Button
      variant={running ? 'outline' : 'win'}
      size={compact ? 'default' : 'lg'}
      onClick={toggle}
      disabled={busy || !!status?.killSwitch}
      className={compact ? '' : 'w-full'}
    >
      {running ? <Square /> : <Play />}
      {busy ? t('common.wait') : running ? t('bot.stop') : t('bot.start')}
    </Button>
  );

  if (compact)
    return (
      <div className="flex flex-col items-end gap-1">
        {button}
        <ErrorNote error={error} />
      </div>
    );

  return (
    <div className="panel flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-lg font-bold">{t('bot.title')}</span>
        <LiveDot
          on={running}
          label={
            status?.killSwitch ? t('bot.killOn') : running ? t('bot.running') : t('bot.stopped')
          }
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {running ? t('bot.runningHint') : t('bot.stoppedHint')}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(status?.markets ?? {}).map(([id, m]) => (
          <span
            key={id}
            title={m.lastError}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs font-medium',
              m.status === 'running'
                ? 'border-win/30 bg-win/10 text-win'
                : m.status === 'error'
                  ? 'border-loss/30 bg-loss/10 text-loss'
                  : 'bg-muted text-muted-foreground',
            )}
          >
            {MARKET_LABEL[id] ?? id}: {t(`mstatus.${m.status}` as TKey)}
          </span>
        ))}
      </div>
      {button}
      <ErrorNote error={error} />
    </div>
  );
}

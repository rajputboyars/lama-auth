import { useState } from 'react';
import { useLive } from '../hooks/live';
import { api } from '../lib/api';
import type { BotStatus } from '../lib/types';
import { ErrorNote, LiveDot } from './ui';

export function BotControls() {
  const { status, setStatus } = useLive();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      setStatus(
        await api<BotStatus>(status?.running ? '/bot/stop' : '/bot/start', { method: 'POST' }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="label">Bot status</span>
        <LiveDot
          on={!!status?.running}
          label={
            status?.killSwitch ? 'KILL SWITCH ON' : status?.running ? 'LIVE (PAPER)' : 'STOPPED'
          }
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(status?.markets ?? {}).map(([id, m]) => (
          <span
            key={id}
            title={m.lastError}
            className={`rounded-full border px-2 py-0.5 text-[11px] ${
              m.status === 'running'
                ? 'border-win/40 text-win'
                : m.status === 'error'
                  ? 'border-loss/40 text-loss'
                  : 'border-edge text-slate-400'
            }`}
          >
            {id}: {m.status}
          </span>
        ))}
      </div>
      <button
        className={status?.running ? 'btn-ghost' : 'btn-primary'}
        onClick={toggle}
        disabled={busy || !!status?.killSwitch}
      >
        {busy ? '…' : status?.running ? 'Stop bot' : 'Start bot'}
      </button>
      <ErrorNote error={error} />
    </div>
  );
}

import { AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';
import { TradeCard } from '../components/TradeCard';
import { Empty, ErrorNote, Panel, Toggle } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { useLive } from '../hooks/live';
import { api } from '../lib/api';
import { MARKET_LABEL } from '../lib/format';
import type { Trade } from '../lib/types';

export function BattleFeed() {
  const live = useLive();
  const [market, setMarket] = useState('');
  const [page, setPage] = useState(1);
  const history = useApi<{ items: Trade[]; total: number }>(
    `/trades?page=${page}&pageSize=30${market ? `&market=${market}` : ''}`,
  );
  const [reviewing, setReviewing] = useState<Trade | null>(null);

  // Live trades first, then history, without duplicates.
  const trades = useMemo(() => {
    const seen = new Set<string>();
    const liveFiltered =
      page === 1 ? live.trades.filter((t) => !market || t.market === market) : [];
    return [...liveFiltered, ...(history.data?.items ?? [])].filter((t) => {
      const k = t.id ?? `${t.time}:${t.symbol}:${t.strategy}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [live.trades, history.data, market, page]);

  const pages = Math.max(1, Math.ceil((history.data?.total ?? 0) / 30));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-black tracking-wide md:text-3xl">
          Live Battle Feed
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <select
            className="input w-auto"
            value={market}
            onChange={(e) => (setMarket(e.target.value), setPage(1))}
            aria-label="Market filter"
          >
            <option value="">All markets</option>
            {Object.entries(MARKET_LABEL).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-slate-400">
            Sound <Toggle checked={live.soundOn} onChange={live.setSoundOn} label="Trade sounds" />
          </label>
        </div>
      </div>
      <ErrorNote error={history.error} />

      {reviewing && (
        <ReviewBox trade={reviewing} onDone={() => (setReviewing(null), void history.reload())} />
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <AnimatePresence initial={false}>
          {trades.map((t) => (
            <TradeCard
              key={t.id ?? `${t.time}:${t.symbol}:${t.strategy}`}
              trade={t}
              onReview={setReviewing}
            />
          ))}
        </AnimatePresence>
      </div>
      {!history.loading && trades.length === 0 && (
        <Empty>No trades yet. Start the bot from the Command Center.</Empty>
      )}

      <div className="flex items-center justify-center gap-3">
        <button
          className="btn-ghost px-3 py-1"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          ← Newer
        </button>
        <span className="num text-xs text-slate-400">
          {page} / {pages}
        </span>
        <button
          className="btn-ghost px-3 py-1"
          disabled={page >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          Older →
        </button>
      </div>
    </div>
  );
}

function ReviewBox({ trade, onDone }: { trade: Trade; onDone(): void }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  async function save() {
    try {
      await api(`/trades/${trade.id}/review`, { method: 'POST', body: { note } });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  return (
    <Panel title={`Review loss: ${trade.symbol} (${trade.strategy})`}>
      <p className="mb-2 text-xs text-slate-400">
        What happened? Was the rule followed? What would you change? Honest notes earn XP — the size
        of the loss does not matter.
      </p>
      <textarea
        className="input min-h-24"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={2000}
      />
      <ErrorNote error={error} />
      <div className="mt-2 flex gap-2">
        <button className="btn-primary" onClick={save} disabled={note.trim().length < 10}>
          Save review
        </button>
        <button className="btn-ghost" onClick={onDone}>
          Cancel
        </button>
      </div>
    </Panel>
  );
}

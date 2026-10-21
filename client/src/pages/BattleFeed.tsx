import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TradeCard } from '@/components/TradeCard';
import { Empty, ErrorNote, PageHeader, Panel, Toggle } from '@/components/common';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApi } from '@/hooks/useApi';
import { useLive } from '@/hooks/live';
import { useLang } from '@/i18n';
import { api } from '@/lib/api';
import { MARKET_LABEL } from '@/lib/format';
import type { Trade } from '@/lib/types';

const ALL = 'all';

export function BattleFeed() {
  const live = useLive();
  const { t } = useLang();
  const [market, setMarket] = useState(ALL);
  const [page, setPage] = useState(1);
  const filter = market === ALL ? '' : market;
  const history = useApi<{ items: Trade[]; total: number }>(
    `/trades?page=${page}&pageSize=30${filter ? `&market=${filter}` : ''}`,
  );
  const [reviewing, setReviewing] = useState<Trade | null>(null);

  // Live trades first, then history, without duplicates.
  const trades = useMemo(() => {
    const seen = new Set<string>();
    const liveFiltered =
      page === 1 ? live.trades.filter((x) => !filter || x.market === filter) : [];
    return [...liveFiltered, ...(history.data?.items ?? [])].filter((x) => {
      const k = x.id ?? `${x.time}:${x.symbol}:${x.strategy}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [live.trades, history.data, filter, page]);

  const pages = Math.max(1, Math.ceil((history.data?.total ?? 0) / 30));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('feed.title')}
        intro={t('feed.intro')}
        action={
          <div className="flex items-center gap-4 text-sm">
            <Select
              value={market}
              onValueChange={(v) => {
                setMarket(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44" aria-label={t('feed.marketFilter')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('common.allMarkets')}</SelectItem>
                {Object.entries(MARKET_LABEL).map(([id, label]) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-muted-foreground">
              {t('feed.sound')}
              <Toggle checked={live.soundOn} onChange={live.setSoundOn} label={t('feed.sound')} />
            </label>
          </div>
        }
      />
      <ErrorNote error={history.error} />

      {reviewing && (
        <ReviewBox trade={reviewing} onDone={() => (setReviewing(null), void history.reload())} />
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <AnimatePresence initial={false}>
          {trades.map((x) => (
            <TradeCard
              key={x.id ?? `${x.time}:${x.symbol}:${x.strategy}`}
              trade={x}
              onReview={setReviewing}
            />
          ))}
        </AnimatePresence>
      </div>
      {!history.loading && trades.length === 0 && <Empty>{t('feed.empty')}</Empty>}

      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          <ChevronLeft /> {t('feed.newer')}
        </Button>
        <span className="num text-xs text-muted-foreground">
          {page} / {pages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          {t('feed.older')} <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

function ReviewBox({ trade, onDone }: { trade: Trade; onDone(): void }) {
  const { t } = useLang();
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
    <Panel title={t('review.title', { symbol: trade.symbol })} hint={t('review.hint')}>
      <textarea
        className="input min-h-24"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={2000}
        placeholder={t('review.placeholder')}
      />
      <ErrorNote error={error} />
      <div className="mt-3 flex gap-2">
        <Button onClick={save} disabled={note.trim().length < 10}>
          {t('review.save')}
        </Button>
        <Button variant="outline" onClick={onDone}>
          {t('common.cancel')}
        </Button>
      </div>
    </Panel>
  );
}

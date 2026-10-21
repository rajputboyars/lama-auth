import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, NotebookPen, Repeat, CircleX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { strategyName } from '@/content/strategies';
import { useLang } from '@/i18n';
import { MARKET_LABEL, money, price, qty, timeAgo } from '@/lib/format';
import type { Trade } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from './common';
import { Term } from './Term';

export function TradeCard({ trade, onReview }: { trade: Trade; onReview?: (t: Trade) => void }) {
  const { t, pick } = useLang();
  const failed = trade.status === 'failed';
  const closing = trade.side !== 'buy';
  const win = closing && trade.pnl > 0;
  const loss = closing && trade.pnl <= 0;
  const Icon = failed
    ? CircleX
    : trade.side === 'buy'
      ? ArrowUpRight
      : trade.side === 'arb'
        ? Repeat
        : ArrowDownRight;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={cn(
        'rounded-2xl border bg-card p-4 shadow-soft',
        !failed && win && 'border-l-4 border-l-win',
        !failed && loss && 'border-l-4 border-l-loss',
        !failed && !closing && 'border-l-4 border-l-primary',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'grid h-8 w-8 place-items-center rounded-lg',
            failed
              ? 'bg-muted text-muted-foreground'
              : win
                ? 'bg-win/10 text-win'
                : loss
                  ? 'bg-loss/10 text-loss'
                  : 'bg-primary/10 text-primary',
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="font-semibold">
            {failed
              ? t('trade.failed')
              : trade.side === 'buy'
                ? t('trade.bought')
                : trade.side === 'arb'
                  ? t('trade.arb')
                  : t('trade.sold')}{' '}
            {trade.symbol}
          </div>
          <div className="text-xs text-muted-foreground">
            {MARKET_LABEL[trade.market]} · {strategyName(trade.strategy, pick)}
          </div>
        </div>
        <span className="ml-auto text-xs text-muted-foreground">{timeAgo(trade.time)}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <Field k={t('trade.amount')} v={qty(trade.quantity)} />
        <Field
          k={<Term id="fill">{t('trade.price')}</Term>}
          v={failed ? '—' : price(trade.fillPrice)}
        />
        <Field
          k={<Term id="fees">{t('trade.costs')}</Term>}
          v={money(trade.fees + trade.taxes, trade.currency)}
        />
        {closing && !failed ? (
          <Field
            k={<Term id="pnl">{t('trade.result')}</Term>}
            v={
              <span className={win ? 'text-win' : 'text-loss'}>
                {money(trade.pnl, trade.currency, { sign: true })}
              </span>
            }
          />
        ) : (
          <Field k={t('trade.screenPrice')} v={price(trade.refPrice)} />
        )}
      </div>
      <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{t('trade.why')}</span> {trade.reason}
      </p>

      {trade.review ? (
        <p className="mt-2 flex gap-2 rounded-lg border p-2 text-xs">
          <NotebookPen className="h-4 w-4 shrink-0 text-primary" /> {trade.review.note}
        </p>
      ) : (
        loss &&
        !failed &&
        onReview &&
        trade.id && (
          <Button variant="outline" size="sm" className="mt-3" onClick={() => onReview(trade)}>
            <NotebookPen /> {t('trade.review')}
          </Button>
        )
      )}
      {failed && <Badge tone="slate">{t('trade.failedHint')}</Badge>}
    </motion.article>
  );
}

function Field({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="num font-medium">{v}</div>
    </div>
  );
}

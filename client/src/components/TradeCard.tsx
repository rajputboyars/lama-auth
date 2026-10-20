import { motion } from 'framer-motion';
import { MARKET_LABEL, money, price, qty, timeAgo } from '../lib/format';
import type { Trade } from '../lib/types';
import { Badge } from './ui';

export function TradeCard({ trade, onReview }: { trade: Trade; onReview?: (t: Trade) => void }) {
  const failed = trade.status === 'failed';
  const closing = trade.side !== 'buy';
  const win = closing && trade.pnl > 0;
  const loss = closing && trade.pnl <= 0;
  const border = failed
    ? 'border-slate-600'
    : win
      ? 'border-win/50 shadow-glow-win'
      : loss
        ? 'border-loss/50 shadow-glow-loss'
        : 'border-neon-cyan/40';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, x: -24, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className={`rounded-2xl border bg-panel/90 p-4 ${border}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          tone={
            failed
              ? 'slate'
              : trade.side === 'buy'
                ? 'cyan'
                : trade.side === 'arb'
                  ? 'pink'
                  : win
                    ? 'win'
                    : 'loss'
          }
        >
          {failed ? 'FAILED' : trade.side.toUpperCase()}
        </Badge>
        <span className="font-semibold">{trade.symbol}</span>
        <span className="text-xs text-slate-500">
          {MARKET_LABEL[trade.market]} · {trade.strategy}
        </span>
        <span className="ml-auto text-xs text-slate-500">{timeAgo(trade.time)}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <Field k="Qty" v={qty(trade.quantity)} />
        <Field k="Fill" v={failed ? '—' : price(trade.fillPrice)} />
        <Field k="Costs" v={money(trade.fees + trade.taxes, trade.currency)} />
        {closing && !failed ? (
          <Field
            k="P/L (net)"
            v={
              <span className={win ? 'text-win' : 'text-loss'}>
                {money(trade.pnl, trade.currency, { sign: true })}
              </span>
            }
          />
        ) : (
          <Field k="Ref price" v={price(trade.refPrice)} />
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400">{trade.reason}</p>

      {trade.review ? (
        <p className="mt-2 rounded-lg border border-edge bg-void/50 p-2 text-xs text-slate-300">
          📝 {trade.review.note}
        </p>
      ) : (
        loss &&
        !failed &&
        onReview &&
        trade.id && (
          <button className="btn-ghost mt-3 px-3 py-1 text-xs" onClick={() => onReview(trade)}>
            Review this loss (+XP)
          </button>
        )
      )}
    </motion.article>
  );
}

function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
      <div className="num">{v}</div>
    </div>
  );
}

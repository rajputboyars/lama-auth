import { motion } from 'framer-motion';
import { Term } from '@/components/Term';
import { Badge, Empty, ErrorNote, Note, PageHeader, Panel } from '@/components/common';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { GUIDE_BY_ID, strategyName } from '@/content/strategies';
import { useApi } from '@/hooks/useApi';
import { useLang } from '@/i18n';
import { MARKET_LABEL, money, pct, tone } from '@/lib/format';
import type { Stats, StrategyRow } from '@/lib/types';

export function StrategyArena() {
  const stats = useApi<Stats>('/stats', { pollMs: 30_000 });
  const { t, pick } = useLang();
  const board = stats.data?.leaderboard ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title={t('arena.title')} intro={t('arena.intro')} />
      <ErrorNote error={stats.error} />

      <Note>
        <p>
          {t('arena.rankedBy')} <Term id="sharpe">{t('arena.sharpe')}</Term>.{' '}
          {t('arena.needTrades')} <Term id="sample-size">{t('arena.why')}</Term>
        </p>
      </Note>

      <Panel title={t('arena.board')}>
        {board.length === 0 ? (
          <Empty>{t('arena.empty')}</Empty>
        ) : (
          <Table className="min-w-[680px]">
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t('arena.col.strategy')}</TableHead>
                <TableHead>{t('arena.col.market')}</TableHead>
                <TableHead className="text-right">
                  <Term id="sharpe">{t('arena.col.sharpe')}</Term>
                </TableHead>
                <TableHead className="text-right">
                  <Term id="drawdown">{t('arena.col.drop')}</Term>
                </TableHead>
                <TableHead className="text-right">
                  <Term id="win-rate">{t('arena.col.win')}</Term>
                </TableHead>
                <TableHead className="text-right">{t('arena.col.trades')}</TableHead>
                <TableHead className="text-right">
                  <Term id="return">{t('arena.col.return')}</Term>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="num">
              {board.map((r) => (
                <TableRow key={`${r.market}:${r.strategy}`}>
                  <TableCell>{r.rank ?? <Badge>{t('arena.unranked')}</Badge>}</TableCell>
                  <TableCell className="font-sans font-semibold">
                    {strategyName(r.strategy, pick)}
                  </TableCell>
                  <TableCell className="font-sans text-muted-foreground">
                    {MARKET_LABEL[r.market]}
                  </TableCell>
                  <TableCell className="text-right">{r.sharpe?.toFixed(3) ?? '—'}</TableCell>
                  <TableCell className="text-right text-loss">
                    {pct(-r.maxDrawdownPct, 1)}
                  </TableCell>
                  <TableCell className="text-right">{pct(r.winRatePct, 0, false)}</TableCell>
                  <TableCell className="text-right">{r.trades}</TableCell>
                  <TableCell className={`text-right ${tone(r.totalReturnPct)}`}>
                    {pct(r.totalReturnPct)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(stats.data?.strategies ?? []).map((r, i) => (
          <StrategyCard key={`${r.market}:${r.strategy}`} row={r} index={i} />
        ))}
      </div>
    </div>
  );
}

function StrategyCard({ row, index }: { row: StrategyRow; index: number }) {
  const { t, pick } = useLang();
  const guide = GUIDE_BY_ID.get(row.strategy);
  const bars = [
    { k: t('arena.col.win'), v: row.winRatePct, max: 100, label: pct(row.winRatePct, 0, false) },
    {
      k: t('arena.col.drop'),
      v: row.maxDrawdownPct,
      max: 30,
      label: pct(row.maxDrawdownPct, 1, false),
      bad: true,
    },
  ];
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.04 }}
      whileHover={{ y: -4 }}
      className="panel"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <span aria-hidden>{guide?.icon ?? '👤'}</span> {strategyName(row.strategy, pick)}
          </h3>
          <p className="text-xs text-muted-foreground">{MARKET_LABEL[row.market]}</p>
        </div>
        {row.ranked ? (
          <Badge tone="cyan">{t('arena.ranked')}</Badge>
        ) : (
          <Badge>{t('arena.needMore', { n: Math.max(0, 30 - row.trades) })}</Badge>
        )}
      </div>
      {guide && <p className="mt-2 text-sm text-muted-foreground">{pick(guide.oneLiner)}</p>}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Mini
          k={t('arena.pnl')}
          v={
            <span className={tone(row.netPnl)}>
              {money(row.netPnl, row.currency, { compact: true, sign: true })}
            </span>
          }
        />
        <Mini k={t('arena.col.trades')} v={row.trades} />
        <Mini k={t('arena.col.sharpe')} v={row.sharpe?.toFixed(2) ?? '—'} />
      </div>
      <div className="mt-4 space-y-2">
        {bars.map((b) => (
          <div key={b.k}>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{b.k}</span>
              <span className="num">{b.label}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={`h-full rounded-full ${b.bad ? 'bg-loss' : 'bg-primary'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (b.v / b.max) * 100)}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {t('arena.costsPaid', { amount: money(row.costsPaid, row.currency) })}
      </p>
    </motion.article>
  );
}

function Mini({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="neu-inset px-2 py-2">
      <div className="text-[11px] text-muted-foreground">{k}</div>
      <div className="num text-sm font-semibold">{v}</div>
    </div>
  );
}

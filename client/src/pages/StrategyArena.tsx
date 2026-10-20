import { motion } from 'framer-motion';
import { Badge, Empty, ErrorNote, Panel } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { MARKET_LABEL, money, pct, tone } from '../lib/format';
import type { Stats, StrategyInfo, StrategyRow } from '../lib/types';

export function StrategyArena() {
  const stats = useApi<Stats>('/stats', { pollMs: 30_000 });
  const strategies = useApi<StrategyInfo[]>('/strategies');
  const nameOf = (id: string) => strategies.data?.find((s) => s.id === id)?.name ?? id;
  const board = stats.data?.leaderboard ?? [];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black tracking-wide md:text-3xl">Strategy Arena</h1>
      <ErrorNote error={stats.error} />

      <Panel title="Leaderboard · ranked by risk-adjusted return (Sharpe), not raw profit">
        <p className="mb-3 text-xs text-slate-400">
          A strategy needs at least 30 closed trades to be ranked. Fewer trades are mostly luck, so
          they stay unranked. A high rank here does <strong>not</strong> mean a strategy will make
          money in live markets.
        </p>
        {board.length === 0 ? (
          <Empty>No wallets yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-2">#</th>
                  <th>Fighter</th>
                  <th>Market</th>
                  <th className="text-right">Sharpe</th>
                  <th className="text-right">Max DD</th>
                  <th className="text-right">Win rate</th>
                  <th className="text-right">Trades</th>
                  <th className="text-right">Return</th>
                </tr>
              </thead>
              <tbody className="num">
                {board.map((r) => (
                  <tr key={`${r.market}:${r.strategy}`} className="border-t border-edge/60">
                    <td className="py-2">{r.rank ?? <Badge>unranked</Badge>}</td>
                    <td className="font-sans font-semibold">{nameOf(r.strategy)}</td>
                    <td className="font-sans text-slate-400">{MARKET_LABEL[r.market]}</td>
                    <td className="text-right">{r.sharpe?.toFixed(3) ?? '—'}</td>
                    <td className="text-right text-loss">{pct(-r.maxDrawdownPct, 1)}</td>
                    <td className="text-right">{pct(r.winRatePct, 0, false)}</td>
                    <td className="text-right">{r.trades}</td>
                    <td className={`text-right ${tone(r.totalReturnPct)}`}>
                      {pct(r.totalReturnPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(stats.data?.strategies ?? []).map((r, i) => (
          <FighterCard
            key={`${r.market}:${r.strategy}`}
            row={r}
            info={strategies.data?.find((s) => s.id === r.strategy)}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

function FighterCard({
  row,
  info,
  index,
}: {
  row: StrategyRow;
  info?: StrategyInfo;
  index: number;
}) {
  const bars = [
    { k: 'Win rate', v: row.winRatePct, max: 100, label: pct(row.winRatePct, 0, false) },
    {
      k: 'Drawdown',
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
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-2xl border border-edge bg-gradient-to-br from-panel to-void p-4 hover:border-neon-violet/60 hover:shadow-glow-pink"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold">{info?.name ?? row.strategy}</h3>
          <p className="text-xs text-slate-500">{MARKET_LABEL[row.market]}</p>
        </div>
        {row.ranked ? (
          <Badge tone="cyan">ranked</Badge>
        ) : (
          <Badge>needs {Math.max(0, 30 - row.trades)} more trades</Badge>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-slate-400">{info?.description}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Mini
          k="P/L"
          v={
            <span className={tone(row.netPnl)}>
              {money(row.netPnl, row.currency, { compact: true, sign: true })}
            </span>
          }
        />
        <Mini k="Trades" v={row.trades} />
        <Mini k="Sharpe" v={row.sharpe?.toFixed(2) ?? '—'} />
      </div>
      <div className="mt-4 space-y-2">
        {bars.map((b) => (
          <div key={b.k}>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{b.k}</span>
              <span className="num">{b.label}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-void">
              <motion.div
                className={`h-full ${b.bad ? 'bg-loss' : 'bg-neon-cyan'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (b.v / b.max) * 100)}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">
        Costs paid: {money(row.costsPaid, row.currency)}
      </p>
    </motion.article>
  );
}

function Mini({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-edge bg-void/50 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
      <div className="num text-sm font-semibold">{v}</div>
    </div>
  );
}

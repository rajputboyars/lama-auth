import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { EquityChart } from '../components/EquityChart';
import { ErrorNote, Panel, Stat } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { MARKET_LABEL, money, pct, price, qty, tone } from '../lib/format';
import type { BacktestResult, MarketInfo, StrategyInfo } from '../lib/types';

const toInput = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function BacktestLab() {
  const strategies = useApi<StrategyInfo[]>('/strategies');
  const markets = useApi<MarketInfo[]>('/markets');
  const testable = useMemo(
    () => (strategies.data ?? []).filter((s) => s.backtestable),
    [strategies.data],
  );

  const [strategy, setStrategy] = useState('trend');
  const [market, setMarket] = useState('crypto');
  const [symbol, setSymbol] = useState('');
  const [interval, setInterval] = useState('1h');
  const [from, setFrom] = useState(toInput(Date.now() - 60 * 86_400_000));
  const [to, setTo] = useState(toInput(Date.now()));
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const symbols = useMemo(
    () => markets.data?.find((m) => m.id === market)?.symbols ?? [],
    [markets.data, market],
  );
  useEffect(() => {
    if (symbols.length && !symbols.includes(symbol)) setSymbol(symbols[0]);
  }, [symbols, symbol]);

  async function run(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(
        await api<BacktestResult>('/backtest', {
          method: 'POST',
          body: {
            strategy,
            market,
            symbol,
            interval,
            from: Date.parse(from),
            to: Date.parse(to) + 86_399_999,
          },
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const s = result?.stats;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black tracking-wide md:text-3xl">Backtest Lab</h1>
      <Panel title="Experiment setup">
        <form onSubmit={run} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Strategy">
            <select
              className="input"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
            >
              {testable.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Market">
            <select className="input" value={market} onChange={(e) => setMarket(e.target.value)}>
              {(markets.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {MARKET_LABEL[m.id]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Symbol">
            <input
              className="input"
              list="symbols"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            />
            <datalist id="symbols">
              {symbols.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Candles">
            <select
              className="input"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
            >
              {['1m', '5m', '15m', '1h', '1d'].map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </Field>
          <Field label="From">
            <input
              className="input"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="To">
            <input
              className="input"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2 lg:col-span-6">
            <button className="btn-primary w-full sm:w-auto" disabled={busy || !symbol}>
              {busy ? 'Running…' : 'Run backtest (+XP)'}
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs text-slate-500">
          Uses saved candles, or fetches the latest available history. Fills at the next candle's
          open with the same costs and risk limits as live paper trading. Cross-exchange arbitrage
          cannot be backtested.
        </p>
      </Panel>
      <ErrorNote error={error} />

      {result && s && (
        <>
          <div className="space-y-1 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-200">
            {result.notes.map((n) => (
              <p key={n}>• {n}</p>
            ))}
            <p className="text-slate-400">
              Data: {result.source}, {result.candles} candles · {result.failedOrders} simulated
              failed orders · {result.blockedSignals} signals blocked by risk
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Stat
              label="Return"
              value={pct(s.totalReturnPct)}
              valueClass={tone(s.totalReturnPct)}
            />
            <Stat label="Max drawdown" value={pct(-s.maxDrawdownPct)} valueClass="text-loss" />
            <Stat label="Sharpe (per bar)" value={s.sharpe?.toFixed(3) ?? '—'} />
            <Stat
              label="Win rate"
              value={pct(s.winRatePct, 0, false)}
              sub={`${s.trades} closed trades`}
            />
            <Stat label="Costs paid" value={money(s.costsPaid, result.currency)} />
          </div>
          <Panel title="Equity curve">
            <EquityChart
              data={result.equityCurve}
              currency={result.currency}
              baseline={result.equityCurve[0]?.equity}
              height={300}
            />
          </Panel>
          <Panel title={`Trades (${result.trades.length})`}>
            <div className="max-h-96 overflow-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="sticky top-0 bg-panel text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2">Time</th>
                    <th>Side</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Costs</th>
                    <th className="text-right">P/L</th>
                  </tr>
                </thead>
                <tbody className="num">
                  {result.trades.map((t, i) => (
                    <tr key={i} className="border-t border-edge/60" title={t.reason}>
                      <td className="py-1.5 font-sans text-xs text-slate-400">
                        {new Date(t.time).toLocaleString()}
                      </td>
                      <td className={t.side === 'buy' ? 'text-neon-cyan' : 'text-neon-pink'}>
                        {t.side}
                      </td>
                      <td className="text-right">{price(t.price)}</td>
                      <td className="text-right">{qty(t.quantity)}</td>
                      <td className="text-right">{money(t.fees + t.taxes, result.currency)}</td>
                      <td
                        className={`text-right ${t.side === 'sell' ? tone(t.pnl) : 'text-slate-500'}`}
                      >
                        {t.side === 'sell' ? money(t.pnl, result.currency, { sign: true }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

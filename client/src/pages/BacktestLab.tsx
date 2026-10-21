import { FlaskConical } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EquityChart } from '@/components/EquityChart';
import { Term } from '@/components/Term';
import { ErrorNote, Note, PageHeader, Panel, Stat } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { strategyName } from '@/content/strategies';
import { useApi } from '@/hooks/useApi';
import { useLang } from '@/i18n';
import { api } from '@/lib/api';
import { MARKET_LABEL, money, pct, price, qty, tone } from '@/lib/format';
import type { BacktestResult, MarketInfo, StrategyInfo } from '@/lib/types';

const toInput = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const INTERVALS = ['1m', '5m', '15m', '1h', '1d'];

export function BacktestLab() {
  const { t, pick } = useLang();
  const [params] = useSearchParams();
  const strategies = useApi<StrategyInfo[]>('/strategies');
  const markets = useApi<MarketInfo[]>('/markets');
  const testable = useMemo(
    () => (strategies.data ?? []).filter((s) => s.backtestable),
    [strategies.data],
  );

  const [strategy, setStrategy] = useState(params.get('strategy') ?? 'trend');
  const [market, setMarket] = useState(params.get('market') ?? 'crypto');
  const [symbol, setSymbol] = useState(params.get('symbol') ?? '');
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
    <div className="space-y-6">
      <PageHeader title={t('lab.title')} intro={t('lab.intro')} />
      <Panel title={t('lab.setup')} hint={t('lab.setupHint')}>
        <form onSubmit={run} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t('lab.strategy')}>
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {testable.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {strategyName(x.id, pick)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('lab.market')}>
            <Select value={market} onValueChange={setMarket}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(markets.data ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {MARKET_LABEL[m.id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={<Term id="symbol">{t('lab.symbol')}</Term>}>
            <Input list="symbols" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
            <datalist id="symbols">
              {symbols.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </Field>
          <Field label={<Term id="timeframe">{t('lab.candles')}</Term>}>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVALS.map((i) => (
                  <SelectItem key={i} value={i}>
                    {t(`tf.${i}` as 'tf.1m')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t('lab.from')}>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t('lab.to')}>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <div className="sm:col-span-2 lg:col-span-3">
            <Button size="lg" disabled={busy || !symbol}>
              <FlaskConical /> {busy ? t('lab.running') : t('lab.run')}
            </Button>
          </div>
        </form>
      </Panel>
      <ErrorNote error={error} />

      {result && s && (
        <>
          <Note tone="warn">
            {result.notes.map((n) => (
              <p key={n}>• {n}</p>
            ))}
            <p className="text-muted-foreground">
              {t('lab.dataLine', {
                source: result.source,
                candles: result.candles,
                failed: result.failedOrders,
                blocked: result.blockedSignals,
              })}
            </p>
          </Note>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Stat
              label={<Term id="return">{t('lab.return')}</Term>}
              value={pct(s.totalReturnPct)}
              valueClass={tone(s.totalReturnPct)}
            />
            <Stat
              label={<Term id="drawdown">{t('lab.drop')}</Term>}
              value={pct(-s.maxDrawdownPct)}
              valueClass="text-loss"
            />
            <Stat
              label={<Term id="sharpe">{t('lab.sharpe')}</Term>}
              value={s.sharpe?.toFixed(3) ?? '—'}
            />
            <Stat
              label={<Term id="win-rate">{t('lab.win')}</Term>}
              value={pct(s.winRatePct, 0, false)}
              sub={t('lab.closed', { n: s.trades })}
            />
            <Stat
              label={<Term id="fees">{t('lab.costs')}</Term>}
              value={money(s.costsPaid, result.currency)}
            />
          </div>
          <Panel title={t('lab.curve')} hint={t('lab.curveHint')}>
            <EquityChart
              data={result.equityCurve}
              currency={result.currency}
              baseline={result.equityCurve[0]?.equity}
              height={300}
            />
          </Panel>
          <Panel title={t('lab.trades', { n: result.trades.length })}>
            <div className="max-h-96 overflow-auto">
              <Table className="min-w-[560px]">
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>{t('lab.col.time')}</TableHead>
                    <TableHead>{t('lab.col.side')}</TableHead>
                    <TableHead className="text-right">{t('lab.col.price')}</TableHead>
                    <TableHead className="text-right">{t('lab.col.qty')}</TableHead>
                    <TableHead className="text-right">{t('lab.col.costs')}</TableHead>
                    <TableHead className="text-right">{t('lab.col.result')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="num">
                  {result.trades.map((x, i) => (
                    <TableRow key={i} title={x.reason}>
                      <TableCell className="font-sans text-xs text-muted-foreground">
                        {new Date(x.time).toLocaleString()}
                      </TableCell>
                      <TableCell className={x.side === 'buy' ? 'text-primary' : 'text-foreground'}>
                        {x.side === 'buy' ? t('common.buy') : t('common.sell')}
                      </TableCell>
                      <TableCell className="text-right">{price(x.price)}</TableCell>
                      <TableCell className="text-right">{qty(x.quantity)}</TableCell>
                      <TableCell className="text-right">
                        {money(x.fees + x.taxes, result.currency)}
                      </TableCell>
                      <TableCell
                        className={`text-right ${x.side === 'sell' ? tone(x.pnl) : 'text-muted-foreground'}`}
                      >
                        {x.side === 'sell' ? money(x.pnl, result.currency, { sign: true }) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">{label}</div>
      {children}
    </div>
  );
}

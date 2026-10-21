import { motion } from 'framer-motion';
import {
  ChartArea,
  ChartCandlestick,
  ChartColumn,
  ChartLine,
  ChartSpline,
  CircleQuestionMark,
  Layers,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { type ChartMarker, type ChartType, LiveChart } from '@/components/LiveChart';
import { Term } from '@/components/Term';
import { ErrorNote, LiveDot, Note, PageHeader } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { strategyName } from '@/content/strategies';
import { useApi } from '@/hooks/useApi';
import { useLive } from '@/hooks/live';
import { type TKey, useLang } from '@/i18n';
import { MARKET_LABEL, pct, price, tone } from '@/lib/format';
import { type Candle, applyTick } from '@/lib/indicators';
import type { MarketInfo, Trade } from '@/lib/types';

const TYPES: { id: ChartType; icon: typeof ChartLine; term?: string }[] = [
  { id: 'candles', icon: ChartCandlestick, term: 'candle' },
  { id: 'bars', icon: ChartColumn, term: 'ohlc' },
  { id: 'heikin', icon: Layers, term: 'heikin-ashi' },
  { id: 'line', icon: ChartLine },
  { id: 'area', icon: ChartArea },
  { id: 'baseline', icon: ChartSpline },
];
const INTERVALS = ['1m', '5m', '15m', '1h', '1d'] as const;
const LIVE_WINDOW_MS = 90_000;

export function LiveCharts() {
  const { t, pick } = useLang();
  const { prices } = useLive();
  const [params, setParams] = useSearchParams();
  const markets = useApi<MarketInfo[]>('/markets', { pollMs: 60_000 });

  const market = params.get('market') ?? 'crypto';
  const marketInfo = markets.data?.find((m) => m.id === market);
  const symbols = marketInfo?.symbols ?? [];
  const symbol = params.get('symbol') ?? symbols[0] ?? '';
  const [interval, setInterval] = useState<(typeof INTERVALS)[number]>('1m');
  const [type, setType] = useState<ChartType>('candles');
  const [volume, setVolume] = useState(true);
  const [sma, setSma] = useState(false);
  const [bands, setBands] = useState(false);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    setParams(next, { replace: true });
  };

  const path = symbol
    ? `/chart/${market}/${encodeURIComponent(symbol)}?interval=${interval}&limit=300`
    : null;
  const history = useApi<Candle[]>(path, { pollMs: 60_000 });
  const trades = useApi<{ items: Trade[] }>(`/trades?market=${market}&status=filled&pageSize=200`, {
    pollMs: 60_000,
  });

  // Live candles: start from the server history and fold in every price tick.
  const [candles, setCandles] = useState<Candle[]>([]);
  useEffect(() => setCandles(history.data ?? []), [history.data]);
  const tick = prices[`${market}:${symbol}`];
  useEffect(() => {
    if (tick) setCandles((cs) => applyTick(cs, tick.price, tick.time, interval));
  }, [tick, interval]);

  const markers = useMemo<ChartMarker[]>(
    () =>
      (trades.data?.items ?? [])
        .filter((x) => x.symbol === symbol && (x.side === 'buy' || x.side === 'sell'))
        .map((x) => ({
          time: x.time,
          side: x.side as 'buy' | 'sell',
          label: `${x.side === 'buy' ? t('common.buy') : t('common.sell')} · ${strategyName(x.strategy, pick)}`,
        })),
    [trades.data, symbol, t, pick],
  );

  const last = candles.at(-1);
  const first = candles[0];
  const change = last && first ? ((last.close - first.open) / first.open) * 100 : 0;
  const live = !!tick && Date.now() - tick.time < LIVE_WINDOW_MS;
  const current = TYPES.find((x) => x.id === type)!;

  return (
    <div className="space-y-6">
      <PageHeader title={t('charts.title')} intro={t('charts.intro')} />

      <div className="panel space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">
              <Term id="market">{t('charts.market')}</Term>
            </div>
            <Select
              value={market}
              onValueChange={(v) =>
                set({ market: v, symbol: markets.data?.find((m) => m.id === v)?.symbols[0] ?? '' })
              }
            >
              <SelectTrigger className="w-40">
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
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">
              <Term id="symbol">{t('charts.symbol')}</Term>
            </div>
            <Select value={symbol} onValueChange={(v) => set({ symbol: v })}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t('common.loading')} />
              </SelectTrigger>
              <SelectContent>
                {symbols.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">
              <Term id="timeframe">{t('charts.timeframe')}</Term>
            </div>
            <Tabs value={interval} onValueChange={(v) => setInterval(v as typeof interval)}>
              <TabsList>
                {INTERVALS.map((i) => (
                  <TabsTrigger key={i} value={i} title={t(`tf.${i}`)}>
                    {i}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="ml-auto text-right">
            <div className="flex items-center justify-end gap-2">
              {marketInfo && !marketInfo.open ? (
                <LiveDot on={false} label={t('markets.closed')} />
              ) : (
                <LiveDot on={live} label={live ? t('charts.live') : t('charts.waitingTicks')} />
              )}
            </div>
            <motion.div
              key={last?.close}
              initial={{ opacity: 0.5, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              className="num mt-1 text-3xl font-bold tracking-tight"
            >
              {last ? price(last.close) : '—'}
            </motion.div>
            <div className={`num text-sm ${tone(change)}`}>
              {pct(change)} {t('charts.inView')}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ToggleGroup
            type="single"
            value={type}
            onValueChange={(v) => v && setType(v as ChartType)}
            aria-label={t('charts.type')}
          >
            {TYPES.map((x) => (
              <ToggleGroupItem
                key={x.id}
                value={x.id}
                aria-label={t(`charts.type.${x.id}` as TKey)}
              >
                <x.icon />
                <span className="hidden sm:inline">{t(`charts.type.${x.id}` as TKey)}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <Switch checked={volume} onCheckedChange={setVolume} />
              <Term id="volume">{t('charts.volume')}</Term>
            </label>
            <label className="flex items-center gap-2">
              <Switch checked={sma} onCheckedChange={setSma} />
              <Term id="sma">{t('charts.sma')}</Term>
            </label>
            <label className="flex items-center gap-2">
              <Switch checked={bands} onCheckedChange={setBands} />
              <Term id="bollinger">{t('charts.bands')}</Term>
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CircleQuestionMark /> {t('charts.whatIsThis')}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <div className="flex items-center gap-2 font-display font-bold">
                  <current.icon className="h-4 w-4" /> {t(`charts.type.${type}` as TKey)}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`charts.explain.${type}` as TKey)}
                </p>
                {(sma || bands) && (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {sma && t('charts.explain.sma')} {bands && t('charts.explain.bands')}
                  </p>
                )}
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t('charts.explain.markers')}
                </p>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <ErrorNote error={history.error} />
        <div className="rounded-xl border bg-background p-2">
          {candles.length > 0 ? (
            <LiveChart
              candles={candles}
              type={type}
              interval={interval}
              volume={volume}
              sma={sma}
              bands={bands}
              markers={markers}
            />
          ) : (
            <div className="grid h-[440px] place-items-center text-sm text-muted-foreground">
              {history.loading ? t('common.loading') : t('charts.noData')}
            </div>
          )}
        </div>
        {sma && (
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 rounded bg-warn" /> {t('charts.legend.fast')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 rounded bg-primary" /> {t('charts.legend.slow')}
            </span>
          </div>
        )}
      </div>

      <Note>
        <p>{t('charts.tip')}</p>
      </Note>
    </div>
  );
}

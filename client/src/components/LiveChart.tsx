import {
  type CandlestickData,
  ColorType,
  CrosshairMode,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type SeriesMarker,
  type SeriesType,
  type Time,
  type UTCTimestamp,
  createChart,
} from 'lightweight-charts';
import { useEffect, useMemo, useRef } from 'react';
import { type ChartColors, useChartColors } from '@/hooks/theme';
import { type Candle, bollingerSeries, heikinAshi, intervalMs, smaSeries } from '@/lib/indicators';

export type ChartType = 'candles' | 'bars' | 'heikin' | 'line' | 'area' | 'baseline';

export interface ChartMarker {
  time: number;
  side: 'buy' | 'sell';
  label: string;
}

export interface LiveChartProps {
  candles: Candle[];
  type: ChartType;
  interval: string;
  volume: boolean;
  sma: boolean;
  bands: boolean;
  markers: ChartMarker[];
  height?: number;
}

const sec = (ms: number) => Math.floor(ms / 1000) as UTCTimestamp;
/** `rgb(r, g, b)` → `rgba(r, g, b, a)`. */
const alpha = (rgb: string, a: number) => rgb.replace('rgb(', 'rgba(').replace(')', `, ${a})`);

function addMain(chart: IChartApi, type: ChartType, c: ChartColors, firstClose: number) {
  const up = { upColor: c.win, downColor: c.loss };
  switch (type) {
    case 'candles':
    case 'heikin':
      return chart.addCandlestickSeries({
        ...up,
        borderVisible: false,
        wickUpColor: c.win,
        wickDownColor: c.loss,
      });
    case 'bars':
      return chart.addBarSeries({ ...up, thinBars: false });
    case 'line':
      return chart.addLineSeries({ color: c.primary, lineWidth: 2 });
    case 'area':
      return chart.addAreaSeries({
        lineColor: c.primary,
        topColor: alpha(c.primary, 0.35),
        bottomColor: alpha(c.primary, 0.02),
        lineWidth: 2,
      });
    case 'baseline':
      return chart.addBaselineSeries({
        baseValue: { type: 'price', price: firstClose },
        topLineColor: c.win,
        bottomLineColor: c.loss,
        topFillColor1: alpha(c.win, 0.28),
        topFillColor2: alpha(c.win, 0.02),
        bottomFillColor1: alpha(c.loss, 0.02),
        bottomFillColor2: alpha(c.loss, 0.28),
        lineWidth: 2,
      });
  }
}

const isOhlc = (t: ChartType) => t === 'candles' || t === 'bars' || t === 'heikin';

/** TradingView lightweight-charts wrapper: one price series plus optional volume and overlays. */
export function LiveChart({
  candles,
  type,
  interval,
  volume,
  sma,
  bands,
  markers,
  height = 440,
}: LiveChartProps) {
  const colors = useChartColors();
  const box = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const volRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const overlayRefs = useRef<ISeriesApi<'Line'>[]>([]);
  const lastShape = useRef<{ first: number; length: number } | null>(null);

  const shown = useMemo(() => (type === 'heikin' ? heikinAshi(candles) : candles), [candles, type]);
  const firstClose = candles[0]?.close ?? 0;

  // (Re)build the chart when the look changes: theme, chart type or which layers are on.
  useEffect(() => {
    if (!box.current) return;
    const chart = createChart(box.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: colors.muted,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      rightPriceScale: { borderColor: colors.border },
      timeScale: {
        borderColor: colors.border,
        timeVisible: intervalMs(interval) < 86_400_000,
        secondsVisible: false,
      },
      crosshair: { mode: CrosshairMode.Normal },
    });
    chartRef.current = chart;
    mainRef.current = addMain(chart, type, colors, firstClose);
    volRef.current = null;
    if (volume) {
      const v = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' });
      v.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      volRef.current = v;
    }
    const overlays: ISeriesApi<'Line'>[] = [];
    const line = (color: string, width: 1 | 2 = 2, dashed = false) =>
      chart.addLineSeries({
        color,
        lineWidth: width,
        lineStyle: dashed ? 2 : 0,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
    if (sma) overlays.push(line(colors.warn), line(colors.primary));
    if (bands)
      overlays.push(
        line(colors.muted, 1, true),
        line(colors.muted, 1),
        line(colors.muted, 1, true),
      );
    overlayRefs.current = overlays;
    lastShape.current = null;
    return () => {
      chart.remove();
      chartRef.current = null;
      mainRef.current = null;
      volRef.current = null;
      overlayRefs.current = [];
    };
    // firstClose only seeds the baseline; changing it should not rebuild the chart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors, type, volume, sma, bands, interval]);

  // Push data. A live tick only touches the last bar, so use update() and keep the user's zoom.
  useEffect(() => {
    const main = mainRef.current;
    const chart = chartRef.current;
    if (!main || !chart || shown.length === 0) return;
    const prev = lastShape.current;
    const tickOnly =
      prev !== null &&
      prev.first === shown[0].time &&
      shown.length - prev.length <= 1 &&
      shown.length >= prev.length;

    const toMain = (k: Candle) =>
      isOhlc(type)
        ? ({
            time: sec(k.time),
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
          } as CandlestickData)
        : ({ time: sec(k.time), value: k.close } as LineData);
    const toVol = (k: Candle): HistogramData => ({
      time: sec(k.time),
      value: k.volume,
      color: alpha(k.close >= k.open ? colors.win : colors.loss, 0.45),
    });

    if (tickOnly) {
      main.update(toMain(shown[shown.length - 1]));
      volRef.current?.update(toVol(shown[shown.length - 1]));
    } else {
      main.setData(shown.map(toMain));
      volRef.current?.setData(shown.map(toVol));
      chart.timeScale().fitContent();
    }

    const toLine = (p: { time: number; value: number }): LineData => ({
      time: sec(p.time),
      value: p.value,
    });
    const [a, b, c, d, e] = overlayRefs.current;
    if (sma) {
      a?.setData(smaSeries(candles, 10).map(toLine));
      b?.setData(smaSeries(candles, 30).map(toLine));
    }
    if (bands) {
      const bb = bollingerSeries(candles, 20, 2);
      const [u, m, l] = sma ? [c, d, e] : [a, b, c];
      u?.setData(bb.upper.map(toLine));
      m?.setData(bb.mid.map(toLine));
      l?.setData(bb.lower.map(toLine));
    }
    lastShape.current = { first: shown[0].time, length: shown.length };
  }, [shown, candles, type, sma, bands, colors]);

  // Buy/sell markers from the bot's trades, snapped to the candle they happened in.
  useEffect(() => {
    const main = mainRef.current;
    if (!main || shown.length === 0) return;
    const step = intervalMs(interval);
    const first = shown[0].time;
    const ms: SeriesMarker<Time>[] = markers
      .filter((m) => m.time >= first)
      .map((m) => ({
        time: sec(Math.floor(m.time / step) * step),
        position: m.side === 'buy' ? ('belowBar' as const) : ('aboveBar' as const),
        color: m.side === 'buy' ? colors.win : colors.loss,
        shape: m.side === 'buy' ? ('arrowUp' as const) : ('arrowDown' as const),
        text: m.label,
      }))
      .sort((x, y) => (x.time as number) - (y.time as number));
    main.setMarkers(ms);
  }, [markers, shown, interval, colors]);

  return <div ref={box} style={{ height }} className="w-full" />;
}

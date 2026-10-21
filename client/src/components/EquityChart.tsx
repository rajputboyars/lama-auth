import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useChartColors } from '@/hooks/theme';
import { useLang } from '@/i18n';
import { money } from '@/lib/format';
import type { Currency, EquityPoint } from '@/lib/types';

export function EquityChart({
  data,
  currency,
  baseline,
  height = 240,
}: {
  data: EquityPoint[];
  currency: Currency;
  baseline?: number;
  height?: number;
}) {
  const c = useChartColors();
  const { t } = useLang();
  if (data.length < 2)
    return (
      <div
        className="grid place-items-center rounded-xl border border-dashed text-sm text-muted-foreground"
        style={{ height }}
      >
        {t('chart.notEnough')}
      </div>
    );
  const last = data.at(-1)!.equity;
  const up = baseline === undefined ? last >= data[0].equity : last >= baseline;
  const color = up ? c.win : c.loss;
  const id = `eq-${currency}-${up ? 'up' : 'down'}`;
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) =>
              new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            }
            stroke={c.muted}
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            dataKey="equity"
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => money(v, currency, { compact: true })}
            stroke={c.muted}
            fontSize={11}
            width={64}
            tickLine={false}
          />
          {baseline !== undefined && (
            <ReferenceLine y={baseline} stroke={c.muted} strokeDasharray="4 4" />
          )}
          <Tooltip
            contentStyle={{
              background: c.card,
              border: `1px solid ${c.border}`,
              borderRadius: 12,
              fontSize: 12,
              color: c.text,
            }}
            labelFormatter={(v) => new Date(Number(v)).toLocaleString()}
            formatter={(v) => [money(Number(v), currency), t('chart.balance')]}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${id})`}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

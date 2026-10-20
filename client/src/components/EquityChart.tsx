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
import { money } from '../lib/format';
import type { Currency, EquityPoint } from '../lib/types';

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
  if (data.length < 2)
    return (
      <div className="grid place-items-center text-sm text-slate-500" style={{ height }}>
        Not enough data yet
      </div>
    );
  const last = data.at(-1)!.equity;
  const up = baseline === undefined ? last >= data[0].equity : last >= baseline;
  const color = up ? '#34d399' : '#f87171';
  const id = `eq-${currency}-${up ? 'up' : 'down'}`;
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1b2440" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(t: number) =>
              new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            }
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
          />
          <YAxis
            dataKey="equity"
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => money(v, currency, { compact: true })}
            stroke="#64748b"
            fontSize={11}
            width={64}
            tickLine={false}
          />
          {baseline !== undefined && (
            <ReferenceLine y={baseline} stroke="#64748b" strokeDasharray="4 4" />
          )}
          <Tooltip
            contentStyle={{
              background: '#0b1020',
              border: '1px solid #1b2440',
              borderRadius: 12,
              fontSize: 12,
            }}
            labelFormatter={(t) => new Date(Number(t)).toLocaleString()}
            formatter={(v) => [money(Number(v), currency), 'Equity']}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${id})`}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

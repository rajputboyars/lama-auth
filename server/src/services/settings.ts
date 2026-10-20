import { z } from 'zod';
import { STRATEGIES } from '../strategies/index.js';
import { MARKET_IDS, type MarketId } from '../types.js';
import { type CostConfig, DEFAULT_COSTS } from './costModel.js';
import { DEFAULT_RISK, type RiskConfig } from './riskManager.js';

export interface StrategySetting {
  enabled: boolean;
  params: Record<string, number>;
}

export interface Settings {
  botRunning: boolean;
  candleInterval: '1m' | '5m' | '15m' | '1h';
  risk: RiskConfig;
  costs: Record<MarketId, CostConfig>;
  markets: Record<MarketId, { enabled: boolean }>;
  strategies: Record<string, StrategySetting>;
}

export function defaultSettings(): Settings {
  return {
    botRunning: false,
    candleInterval: '1m',
    risk: { ...DEFAULT_RISK },
    costs: structuredClone(DEFAULT_COSTS),
    markets: Object.fromEntries(MARKET_IDS.map((m) => [m, { enabled: true }])) as Settings['markets'],
    strategies: Object.fromEntries(
      STRATEGIES.map((s) => [s.id, { enabled: true, params: Object.fromEntries(s.params.map((p) => [p.key, p.default])) }]),
    ),
  };
}

const pctNum = z.number().min(0).max(100);

export const TaxRuleSchema = z.object({
  name: z.string().min(1).max(40),
  side: z.enum(['buy', 'sell', 'both']),
  base: z.enum(['notional', 'fees']),
  pct: pctNum,
  fixed: z.number().min(0).max(10_000).optional(),
});

export const CostConfigSchema = z.object({
  feePct: pctNum,
  feeFixed: z.number().min(0).max(10_000),
  feeMin: z.number().min(0).max(10_000),
  feeMax: z.number().min(0).optional(),
  taxes: z.array(TaxRuleSchema).max(20),
  spreadPct: pctNum,
  slippagePct: pctNum,
  delayMs: z.number().int().min(0).max(60_000),
  failChance: z.number().min(0).max(1),
});

export const RiskConfigSchema = z.object({
  maxTradePct: z.number().gt(0).max(100),
  maxTradeValue: z.number().min(0),
  dailyLossLimitPct: z.number().gt(0).max(100),
  maxOpenPositions: z.number().int().min(1).max(100),
  killSwitch: z.boolean(),
});

const marketRecord = <T extends z.ZodTypeAny>(schema: T) =>
  z.object(Object.fromEntries(MARKET_IDS.map((m) => [m, schema.optional()])) as Record<MarketId, z.ZodOptional<T>>);

/** PUT /api/settings accepts a partial update; fields left out are kept. */
export const SettingsPatchSchema = z
  .object({
    candleInterval: z.enum(['1m', '5m', '15m', '1h']).optional(),
    risk: RiskConfigSchema.partial().optional(),
    costs: marketRecord(CostConfigSchema).optional(),
    markets: marketRecord(z.object({ enabled: z.boolean() })).optional(),
    strategies: z
      .record(
        z.string(),
        z.object({ enabled: z.boolean().optional(), params: z.record(z.string(), z.number().finite()).optional() }),
      )
      .optional(),
  })
  .strict();

export type SettingsPatch = z.infer<typeof SettingsPatchSchema>;

export function applySettingsPatch(current: Settings, patch: SettingsPatch): Settings {
  const next = structuredClone(current);
  if (patch.candleInterval) next.candleInterval = patch.candleInterval;
  if (patch.risk) next.risk = { ...next.risk, ...patch.risk };
  for (const m of MARKET_IDS) {
    const c = patch.costs?.[m];
    if (c) next.costs[m] = c;
    const mk = patch.markets?.[m];
    if (mk) next.markets[m] = mk;
  }
  for (const [id, s] of Object.entries(patch.strategies ?? {})) {
    if (!STRATEGIES.some((x) => x.id === id)) throw new Error(`Unknown strategy: ${id}`);
    const cur = next.strategies[id] ?? { enabled: true, params: {} };
    next.strategies[id] = { enabled: s.enabled ?? cur.enabled, params: { ...cur.params, ...(s.params ?? {}) } };
  }
  return next;
}

/** Fills in any keys missing from a stored settings document (e.g. after adding a strategy). */
export function withSettingDefaults(stored: Partial<Settings> | null | undefined): Settings {
  const d = defaultSettings();
  if (!stored) return d;
  return {
    botRunning: stored.botRunning ?? d.botRunning,
    candleInterval: stored.candleInterval ?? d.candleInterval,
    risk: { ...d.risk, ...(stored.risk ?? {}) },
    costs: { ...d.costs, ...(stored.costs ?? {}) },
    markets: { ...d.markets, ...(stored.markets ?? {}) },
    strategies: Object.fromEntries(
      Object.entries(d.strategies).map(([id, s]) => [
        id,
        { enabled: stored.strategies?.[id]?.enabled ?? s.enabled, params: { ...s.params, ...(stored.strategies?.[id]?.params ?? {}) } },
      ]),
    ),
  };
}

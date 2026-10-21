import type { Bi } from '../i18n';
import type { RiskConfig } from '../lib/types';

const b = (en: string, hinglish: string): Bi => ({ en, hinglish });

export type PresetId = 'careful' | 'balanced' | 'bold';

export interface RiskPreset {
  id: PresetId;
  icon: string;
  name: Bi;
  summary: Bi;
  risk: Pick<RiskConfig, 'maxTradePct' | 'dailyLossLimitPct' | 'maxOpenPositions'>;
}

/** Safety limits as three easy choices. Balanced matches the server's DEFAULT_RISK. */
export const RISK_PRESETS: RiskPreset[] = [
  {
    id: 'careful',
    icon: '🐢',
    name: b('Careful', 'Savdhaan'),
    summary: b(
      'Small trades (5% each), stops for the day after a 2% loss, at most 2 trades at once.',
      'Chhote trades (har ek 5%), 2% loss pe din ke liye ruk jaata hai, ek saath max 2 trades.',
    ),
    risk: { maxTradePct: 5, dailyLossLimitPct: 2, maxOpenPositions: 2 },
  },
  {
    id: 'balanced',
    icon: '⚖️',
    name: b('Balanced', 'Santulit'),
    summary: b(
      'Medium trades (10% each), stops for the day after a 3% loss, at most 3 trades at once.',
      'Medium trades (har ek 10%), 3% loss pe din ke liye ruk jaata hai, ek saath max 3 trades.',
    ),
    risk: { maxTradePct: 10, dailyLossLimitPct: 3, maxOpenPositions: 3 },
  },
  {
    id: 'bold',
    icon: '🚀',
    name: b('Bold', 'Bindaas'),
    summary: b(
      'Bigger trades (20% each), allows a 5% loss per day, up to 6 trades at once. Wins and losses both grow.',
      'Bade trades (har ek 20%), din mein 5% loss tak, ek saath 6 trades tak. Fayda aur nuksaan dono badhte hain.',
    ),
    risk: { maxTradePct: 20, dailyLossLimitPct: 5, maxOpenPositions: 6 },
  },
];

/** Which preset the current limits match, or 'custom' when they were edited by hand. */
export function presetOf(risk: Pick<RiskConfig, keyof RiskPreset['risk']>): PresetId | 'custom' {
  const hit = RISK_PRESETS.find(
    (p) =>
      p.risk.maxTradePct === risk.maxTradePct &&
      p.risk.dailyLossLimitPct === risk.dailyLossLimitPct &&
      p.risk.maxOpenPositions === risk.maxOpenPositions,
  );
  return hit?.id ?? 'custom';
}

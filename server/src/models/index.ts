import mongoose, { Schema } from 'mongoose';
import { MARKET_IDS } from '../types.js';

const market = { type: String, enum: MARKET_IDS, required: true, index: true };

const PositionSchema = new Schema(
  { symbol: String, quantity: Number, avgPrice: Number, openedAt: Number },
  { _id: false },
);

export const WalletModel = mongoose.model(
  'Wallet',
  new Schema(
    {
      market,
      strategy: { type: String, required: true },
      currency: { type: String, enum: ['USD', 'INR'], required: true },
      startingCash: Number,
      cash: Number,
      positions: [PositionSchema],
      realizedPnl: Number,
      feesPaid: Number,
      taxesPaid: Number,
      peakEquity: Number,
      maxDrawdownPct: Number,
      createdAt: Number,
      dayKey: String,
      dayStartEquity: Number,
    },
    { versionKey: false },
  ).index({ market: 1, strategy: 1 }, { unique: true }),
);

export const TradeModel = mongoose.model(
  'Trade',
  new Schema(
    {
      market,
      strategy: { type: String, required: true, index: true },
      symbol: String,
      currency: String,
      side: { type: String, enum: ['buy', 'sell', 'arb'] },
      status: { type: String, enum: ['filled', 'failed'] },
      quantity: Number,
      refPrice: Number,
      fillPrice: Number,
      fees: Number,
      taxes: Number,
      spreadCost: Number,
      slippageCost: Number,
      pnl: Number,
      reason: String,
      time: { type: Number, index: true },
      review: { note: String, at: Number },
    },
    { versionKey: false },
  ),
);

export const SignalModel = mongoose.model(
  'Signal',
  new Schema(
    {
      market,
      strategy: String,
      symbol: String,
      action: { type: String, enum: ['buy', 'sell', 'wait'] },
      reason: String,
      taken: Boolean,
      skipReason: String,
      price: Number,
      time: { type: Number, index: true },
      // Signals are high volume: keep 30 days
      expireAt: { type: Date, default: () => new Date(Date.now() + 30 * 86_400_000) },
    },
    { versionKey: false },
  ).index({ expireAt: 1 }, { expireAfterSeconds: 0 }),
);

export const CandleModel = mongoose.model(
  'Candle',
  new Schema(
    {
      market,
      symbol: { type: String, required: true },
      interval: { type: String, required: true },
      time: { type: Number, required: true },
      open: Number,
      high: Number,
      low: Number,
      close: Number,
      volume: Number,
      // Set only for fine-grained intervals; coarse candles are kept forever for backtests.
      expireAt: { type: Date, required: false },
    },
    { versionKey: false },
  )
    .index({ market: 1, symbol: 1, interval: 1, time: 1 }, { unique: true })
    .index({ expireAt: 1 }, { expireAfterSeconds: 0 }),
);

export const SettingsModel = mongoose.model(
  'Settings',
  new Schema({ key: { type: String, unique: true }, value: Schema.Types.Mixed }, { versionKey: false, minimize: false }),
);

export const PlayerProfileModel = mongoose.model(
  'PlayerProfile',
  new Schema(
    {
      key: { type: String, unique: true, default: 'admin' },
      xp: { type: Number, default: 0 },
      counters: { type: Schema.Types.Mixed, default: {} },
      history: [{ _id: false, at: Number, amount: Number, reason: String }],
    },
    { versionKey: false, minimize: false },
  ),
);

export const AchievementModel = mongoose.model(
  'Achievement',
  new Schema({ key: { type: String, unique: true }, unlockedAt: Number }, { versionKey: false }),
);

export const QuestModel = mongoose.model(
  'Quest',
  new Schema(
    {
      key: String,
      period: String, // e.g. "d:2026-10-20" or "w:2026-10-19"
      progress: { type: Number, default: 0 },
      target: Number,
      completedAt: Number,
      meta: { type: Schema.Types.Mixed, default: {} },
    },
    { versionKey: false, minimize: false },
  ).index({ key: 1, period: 1 }, { unique: true }),
);

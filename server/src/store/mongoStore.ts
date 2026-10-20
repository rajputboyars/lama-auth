import mongoose from 'mongoose';
import type { Interval } from '../adapters/types.js';
import {
  CandleModel,
  SettingsModel,
  SignalModel,
  TradeModel,
  WalletModel,
} from '../models/index.js';
import { type Settings, withSettingDefaults } from '../services/settings.js';
import type { Candle, MarketId } from '../types.js';
import { resetWallet } from '../services/paperWallet.js';
import type {
  SignalQuery,
  SignalRecord,
  Store,
  TradeQuery,
  TradeRecord,
  WalletRecord,
} from './types.js';

const FINE_INTERVAL_TTL_MS: Partial<Record<Interval, number>> = {
  '1m': 14 * 86_400_000,
  '5m': 60 * 86_400_000,
};

const strip = <T>(doc: unknown): T => {
  const { _id, ...rest } = doc as Record<string, unknown>;
  return { ...rest, id: _id ? String(_id) : undefined } as T;
};

export class MongoStore implements Store {
  async getSettings(): Promise<Settings> {
    const doc = await SettingsModel.findOne({ key: 'global' }).lean();
    return withSettingDefaults(doc?.value as Partial<Settings> | undefined);
  }

  async saveSettings(s: Settings): Promise<void> {
    await SettingsModel.updateOne({ key: 'global' }, { $set: { value: s } }, { upsert: true });
  }

  async getWallet(market: MarketId, strategy: string): Promise<WalletRecord | null> {
    const doc = await WalletModel.findOne({ market, strategy }).lean();
    return doc ? strip<WalletRecord>(doc) : null;
  }

  async saveWallet(w: WalletRecord): Promise<void> {
    const { id: _id, ...data } = w as WalletRecord & { id?: string };
    await WalletModel.replaceOne({ market: w.market, strategy: w.strategy }, data, {
      upsert: true,
    });
  }

  async listWallets(): Promise<WalletRecord[]> {
    return (await WalletModel.find().lean()).map((d) => strip<WalletRecord>(d));
  }

  async insertTrade(t: TradeRecord): Promise<TradeRecord> {
    const doc = await TradeModel.create(t);
    return strip<TradeRecord>(doc.toObject());
  }

  async listTrades(q: TradeQuery) {
    const filter: Record<string, unknown> = {};
    if (q.market) filter.market = q.market;
    if (q.strategy) filter.strategy = q.strategy;
    if (q.status) filter.status = q.status;
    const [items, total] = await Promise.all([
      TradeModel.find(filter)
        .sort({ time: -1 })
        .skip((q.page - 1) * q.pageSize)
        .limit(q.pageSize)
        .lean(),
      TradeModel.countDocuments(filter),
    ]);
    return { items: items.map((d) => strip<TradeRecord>(d)), total };
  }

  async getTrade(id: string): Promise<TradeRecord | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await TradeModel.findById(id).lean();
    return doc ? strip<TradeRecord>(doc) : null;
  }

  async reviewTrade(id: string, note: string, at: number): Promise<TradeRecord | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await TradeModel.findByIdAndUpdate(
      id,
      { $set: { review: { note, at } } },
      { new: true },
    ).lean();
    return doc ? strip<TradeRecord>(doc) : null;
  }

  async insertSignal(s: SignalRecord): Promise<void> {
    await SignalModel.create(s);
  }

  async listSignals(q: SignalQuery) {
    const filter: Record<string, unknown> = {};
    if (q.market) filter.market = q.market;
    if (q.strategy) filter.strategy = q.strategy;
    if (q.taken !== undefined) filter.taken = q.taken;
    const [items, total] = await Promise.all([
      SignalModel.find(filter, { expireAt: 0 })
        .sort({ time: -1 })
        .skip((q.page - 1) * q.pageSize)
        .limit(q.pageSize)
        .lean(),
      SignalModel.countDocuments(filter),
    ]);
    return { items: items.map((d) => strip<SignalRecord>(d)), total };
  }

  async resetWallets(filter: { market?: MarketId; strategy?: string }): Promise<number> {
    const wallets = (await this.listWallets()).filter(
      (w) =>
        (!filter.market || w.market === filter.market) &&
        (!filter.strategy || w.strategy === filter.strategy),
    );
    for (const w of wallets) await this.saveWallet(resetWallet(w));
    return wallets.length;
  }

  async saveCandles(
    market: MarketId,
    symbol: string,
    interval: Interval,
    candles: Candle[],
  ): Promise<void> {
    if (!candles.length) return;
    const ttl = FINE_INTERVAL_TTL_MS[interval];
    await CandleModel.bulkWrite(
      candles.map((c) => ({
        updateOne: {
          filter: { market, symbol, interval, time: c.time },
          update: { $set: { ...c, ...(ttl ? { expireAt: new Date(c.time + ttl) } : {}) } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }

  async getCandles(
    market: MarketId,
    symbol: string,
    interval: Interval,
    from = 0,
    to = Date.now(),
    limit = 5000,
  ) {
    const docs = await CandleModel.find({
      market,
      symbol,
      interval,
      time: { $gte: from, $lte: to },
    })
      .sort({ time: -1 })
      .limit(limit)
      .lean();
    return docs
      .reverse()
      .map(
        ({ time, open, high, low, close, volume }) =>
          ({ time, open, high, low, close, volume }) as Candle,
      );
  }
}

import type { Interval } from '../adapters/types.js';
import { type Settings, defaultSettings } from '../services/settings.js';
import type { Candle, MarketId } from '../types.js';
import { resetWallet } from '../services/paperWallet.js';
import type { SignalQuery, SignalRecord, Store, TradeQuery, TradeRecord, WalletRecord } from './types.js';

export class MemoryStore implements Store {
  settings: Settings = defaultSettings();
  wallets = new Map<string, WalletRecord>();
  trades: TradeRecord[] = [];
  signals: SignalRecord[] = [];
  candles = new Map<string, Map<number, Candle>>();

  async getSettings() {
    return structuredClone(this.settings);
  }
  async saveSettings(s: Settings) {
    this.settings = structuredClone(s);
  }
  async getWallet(market: MarketId, strategy: string) {
    const w = this.wallets.get(`${market}:${strategy}`);
    return w ? structuredClone(w) : null;
  }
  async saveWallet(w: WalletRecord) {
    this.wallets.set(`${w.market}:${w.strategy}`, structuredClone(w));
  }
  async listWallets() {
    return [...this.wallets.values()].map((w) => structuredClone(w));
  }
  async insertTrade(t: TradeRecord) {
    const rec = { ...t, id: String(this.trades.length + 1) };
    this.trades.push(rec);
    return rec;
  }
  async listTrades(q: TradeQuery) {
    const all = this.trades
      .filter((t) => (!q.market || t.market === q.market) && (!q.strategy || t.strategy === q.strategy))
      .filter((t) => !q.status || t.status === q.status)
      .sort((a, b) => b.time - a.time);
    return { items: all.slice((q.page - 1) * q.pageSize, q.page * q.pageSize), total: all.length };
  }
  async getTrade(id: string) {
    return this.trades.find((t) => t.id === id) ?? null;
  }
  async reviewTrade(id: string, note: string, at: number) {
    const t = this.trades.find((x) => x.id === id);
    if (!t) return null;
    t.review = { note, at };
    return t;
  }
  async insertSignal(s: SignalRecord) {
    this.signals.push(s);
  }
  async listSignals(q: SignalQuery) {
    const all = this.signals
      .filter((s) => (!q.market || s.market === q.market) && (!q.strategy || s.strategy === q.strategy))
      .filter((s) => q.taken === undefined || s.taken === q.taken)
      .sort((a, b) => b.time - a.time);
    return { items: all.slice((q.page - 1) * q.pageSize, q.page * q.pageSize), total: all.length };
  }
  async resetWallets(filter: { market?: MarketId; strategy?: string }) {
    let n = 0;
    for (const [k, w] of this.wallets) {
      if ((filter.market && w.market !== filter.market) || (filter.strategy && w.strategy !== filter.strategy)) continue;
      this.wallets.set(k, resetWallet(w));
      n++;
    }
    return n;
  }
  async saveCandles(market: MarketId, symbol: string, interval: Interval, candles: Candle[]) {
    const key = `${market}:${symbol}:${interval}`;
    const m = this.candles.get(key) ?? new Map<number, Candle>();
    for (const c of candles) m.set(c.time, c);
    this.candles.set(key, m);
  }
  async getCandles(market: MarketId, symbol: string, interval: Interval, from = 0, to = Infinity, limit = 5000) {
    const m = this.candles.get(`${market}:${symbol}:${interval}`);
    return [...(m?.values() ?? [])]
      .filter((c) => c.time >= from && c.time <= to)
      .sort((a, b) => a.time - b.time)
      .slice(-limit);
  }
}

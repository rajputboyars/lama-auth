import { EventEmitter } from 'node:events';
import { BaseAdapter } from '../adapters/base.js';
import { type MarketAdapter, hasVenueQuotes } from '../adapters/types.js';
import { logger } from '../config/logger.js';
import { findOpportunity } from '../strategies/arbitrage.js';
import { strategiesFor } from '../strategies/index.js';
import type { Strategy } from '../strategies/types.js';
import { CANDLE_WINDOW } from '../services/backtester.js';
import { estimateCosts, rollFailure } from '../services/costModel.js';
import { cleanCandles, isSaneTick } from '../services/dataGuard.js';
import { applyBuy, applySell, createWallet, equity, findPosition, updateDrawdown } from '../services/paperWallet.js';
import { sleep as realSleep } from '../services/retry.js';
import { type RiskBlock, evaluate } from '../services/riskManager.js';
import type { Settings } from '../services/settings.js';
import type { SignalRecord, Store, TradeRecord, WalletRecord } from '../store/types.js';
import type { Candle, MarketId, Quote, Side } from '../types.js';

export type MarketStatus = 'idle' | 'running' | 'closed' | 'disabled' | 'halted' | 'error';

export interface MarketState {
  status: MarketStatus;
  lastTickAt?: number;
  lastError?: string;
  consecutiveErrors: number;
}

export interface BotStatus {
  running: boolean;
  killSwitch: boolean;
  markets: Record<string, MarketState>;
}

export interface EngineOptions {
  maxTickJumpPct: number;
  rng?: () => number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface RiskBreachEvent {
  market: MarketId;
  strategy: string;
  block: RiskBlock;
}

const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const MAX_BACKOFF_FACTOR = 16;

/**
 * Runs one independent loop per market. A failing market backs off and keeps retrying
 * without affecting the others. All execution is simulated: there is no order routing here.
 */
export class BotEngine extends EventEmitter {
  private readonly timers = new Map<MarketId, NodeJS.Timeout>();
  private readonly inFlight = new Map<MarketId, Promise<void>>();
  private readonly lastPrice = new Map<string, number>();
  private readonly breachedToday = new Set<string>();
  private readonly states = new Map<MarketId, MarketState>();
  private running = false;
  private readonly rng: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;

  constructor(
    private readonly adapters: Map<MarketId, MarketAdapter>,
    private readonly store: Store,
    private readonly opts: EngineOptions,
  ) {
    super();
    this.rng = opts.rng ?? Math.random;
    this.sleep = opts.sleep ?? realSleep;
    this.now = opts.now ?? Date.now;
    for (const id of adapters.keys()) this.states.set(id, { status: 'idle', consecutiveErrors: 0 });
  }

  isRunning(): boolean {
    return this.running;
  }

  latestPrices(): Record<string, number> {
    return Object.fromEntries(this.lastPrice);
  }

  async status(): Promise<BotStatus> {
    const settings = await this.store.getSettings();
    return { running: this.running, killSwitch: settings.risk.killSwitch, markets: Object.fromEntries(this.states) };
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    await this.persistRunning(true);
    for (const id of this.adapters.keys()) this.schedule(id, 0);
    logger.info({ markets: [...this.adapters.keys()] }, 'bot started (paper trading)');
    await this.emitStatus();
  }

  async stop(): Promise<void> {
    this.running = false;
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    await Promise.allSettled(this.inFlight.values());
    for (const s of this.states.values()) s.status = 'idle';
    await this.persistRunning(false);
    logger.info('bot stopped');
    await this.emitStatus();
  }

  private async persistRunning(running: boolean) {
    const s = await this.store.getSettings();
    if (s.botRunning !== running) await this.store.saveSettings({ ...s, botRunning: running });
  }

  private schedule(id: MarketId, delayMs: number) {
    if (!this.running) return;
    const timer = setTimeout(async () => {
      const run = this.tickMarket(id);
      this.inFlight.set(id, run);
      await run;
      this.inFlight.delete(id);
      const state = this.states.get(id)!;
      const factor = Math.min(MAX_BACKOFF_FACTOR, 2 ** state.consecutiveErrors);
      this.schedule(id, this.adapters.get(id)!.tickMs * factor);
    }, delayMs);
    this.timers.set(id, timer);
  }

  /** One pass over a market. Never throws: errors are contained to this market. */
  async tickMarket(id: MarketId): Promise<void> {
    const adapter = this.adapters.get(id);
    const state = this.states.get(id);
    if (!adapter || !state) return;
    const prevStatus = state.status;
    try {
      const settings = await this.store.getSettings();
      state.status = this.gate(adapter, settings);
      if (state.status === 'running') {
        if (adapter instanceof BaseAdapter) adapter.setCostConfig(settings.costs[id]);
        await this.processMarket(adapter, settings);
      }
      state.consecutiveErrors = 0;
      state.lastError = undefined;
    } catch (err) {
      state.status = 'error';
      state.consecutiveErrors++;
      state.lastError = err instanceof Error ? err.message : String(err);
      logger.error({ market: id, err: state.lastError, attempt: state.consecutiveErrors }, 'market tick failed');
    }
    state.lastTickAt = this.now();
    if (state.status !== prevStatus || state.status === 'error') await this.emitStatus();
  }

  private gate(adapter: MarketAdapter, settings: Settings): MarketStatus {
    if (settings.risk.killSwitch) return 'halted';
    if (!settings.markets[adapter.id]?.enabled) return 'disabled';
    if (!adapter.isOpen(new Date(this.now()))) return 'closed';
    return 'running';
  }

  private async processMarket(adapter: MarketAdapter, settings: Settings) {
    const strategies = strategiesFor(adapter.id).filter((s) => settings.strategies[s.id]?.enabled);
    const symbols = await adapter.listSymbols();
    let failures = 0;

    for (const symbol of symbols) {
      try {
        const quote = await this.saneQuote(adapter, symbol);
        if (!quote) continue;
        const raw = await adapter.getCandles(symbol, settings.candleInterval, CANDLE_WINDOW);
        const candles = cleanCandles(raw, this.opts.maxTickJumpPct);
        await this.store.saveCandles(adapter.id, symbol, settings.candleInterval, candles);

        for (const strategy of strategies) {
          await this.runStrategy(adapter, strategy, symbol, candles, quote, settings);
        }
      } catch (err) {
        failures++;
        logger.warn({ market: adapter.id, symbol, err: String(err) }, 'symbol skipped this tick');
      }
    }
    if (symbols.length > 0 && failures === symbols.length) throw new Error(`All ${failures} symbols failed`);

    await this.markWallets(adapter, strategies);
  }

  /** Fetches a quote and drops it if it jumps implausibly far from the last good price. */
  private async saneQuote(adapter: MarketAdapter, symbol: string): Promise<Quote | null> {
    const quote = await adapter.getPrice(symbol);
    const key = `${adapter.id}:${symbol}`;
    if (!isSaneTick(this.lastPrice.get(key), quote.price, this.opts.maxTickJumpPct)) {
      logger.warn({ market: adapter.id, symbol, price: quote.price, prev: this.lastPrice.get(key) }, 'bad tick ignored');
      return null;
    }
    this.lastPrice.set(key, quote.price);
    this.emit('price:update', { market: adapter.id, ...quote });
    return quote;
  }

  private marketPrices(market: MarketId): Record<string, number> {
    const prefix = `${market}:`;
    const out: Record<string, number> = {};
    for (const [k, v] of this.lastPrice) if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
    return out;
  }

  private async loadWallet(adapter: MarketAdapter, strategy: string): Promise<WalletRecord> {
    const existing = await this.store.getWallet(adapter.id, strategy);
    const w: WalletRecord = existing ?? createWallet(adapter.id, strategy, adapter.currency, undefined, this.now());
    const today = dayKey(this.now());
    if (w.dayKey !== today) {
      w.dayKey = today;
      w.dayStartEquity = equity(w, this.marketPrices(adapter.id));
    }
    return w;
  }

  private async runStrategy(
    adapter: MarketAdapter,
    strategy: Strategy,
    symbol: string,
    candles: Candle[],
    quote: Quote,
    settings: Settings,
  ) {
    const params = settings.strategies[strategy.id]?.params;
    const costs = settings.costs[adapter.id];
    let wallet = await this.loadWallet(adapter, strategy.id);
    const position = findPosition(wallet, symbol);
    const venueQuotes = strategy.id === 'arbitrage' && hasVenueQuotes(adapter) ? await adapter.getVenueQuotes(symbol) : undefined;

    const signal = strategy.check(candles, position, params, { venueQuotes, costs });
    if (signal.action === 'wait') return;

    const base: SignalRecord = {
      market: adapter.id,
      strategy: strategy.id,
      symbol,
      action: signal.action,
      reason: signal.reason,
      taken: false,
      price: quote.price,
      time: this.now(),
    };

    const eqNow = equity(wallet, this.marketPrices(adapter.id));
    const decision = evaluate(
      {
        action: signal.action,
        price: quote.price,
        equity: eqNow,
        cash: wallet.cash,
        openPositions: wallet.positions.length,
        heldQuantity: position?.quantity ?? 0,
        dayStartEquity: wallet.dayStartEquity ?? eqNow,
      },
      settings.risk,
    );
    if (!decision.allowed) {
      await this.store.insertSignal({ ...base, skipReason: decision.reason });
      this.reportBreach(adapter.id, strategy.id, decision.block);
      return;
    }

    // Simulated network/exchange latency, then re-price: we never fill at the signal price.
    await this.sleep(costs.delayMs);

    if (strategy.id === 'arbitrage') {
      wallet = await this.executeArbitrage(adapter, wallet, symbol, decision.quantity, base, settings);
    } else {
      wallet = await this.executeTrade(adapter, wallet, symbol, signal.action, decision.quantity, base, settings);
    }
    await this.store.saveWallet(wallet);
  }

  private async executeTrade(
    adapter: MarketAdapter,
    wallet: WalletRecord,
    symbol: string,
    side: Side,
    quantity: number,
    sig: SignalRecord,
    settings: Settings,
  ): Promise<WalletRecord> {
    const costs = settings.costs[adapter.id];
    const fresh = await adapter.getPrice(symbol);
    const trade: TradeRecord = {
      market: adapter.id,
      strategy: sig.strategy,
      symbol,
      currency: adapter.currency,
      side,
      status: 'failed',
      quantity,
      refPrice: fresh.price,
      fillPrice: 0,
      fees: 0,
      taxes: 0,
      spreadCost: 0,
      slippageCost: 0,
      pnl: 0,
      reason: sig.reason,
      time: this.now(),
    };

    if (rollFailure(costs, this.rng)) {
      await this.recordFailure(trade, sig, 'Simulated order rejection');
      return wallet;
    }

    const breakdown = estimateCosts({ side, symbol, quantity, price: fresh.price }, costs);
    try {
      const res =
        side === 'buy'
          ? applyBuy(wallet, symbol, quantity, breakdown, this.now())
          : applySell(wallet, symbol, quantity, breakdown);
      const filled = await this.store.insertTrade({
        ...trade,
        status: 'filled',
        fillPrice: breakdown.fillPrice,
        fees: breakdown.fees,
        taxes: breakdown.taxes,
        spreadCost: breakdown.spreadCost,
        slippageCost: breakdown.slippageCost,
        pnl: res.pnl,
      });
      await this.store.insertSignal({ ...sig, taken: true });
      this.emit('trade:new', filled);
      return { ...wallet, ...res.wallet };
    } catch (err) {
      await this.recordFailure(trade, sig, err instanceof Error ? err.message : String(err));
      return wallet;
    }
  }

  /** Both legs at once on different venues. Re-quotes after the delay, so the gap may have closed. */
  private async executeArbitrage(
    adapter: MarketAdapter,
    wallet: WalletRecord,
    symbol: string,
    quantity: number,
    sig: SignalRecord,
    settings: Settings,
  ): Promise<WalletRecord> {
    const costs = settings.costs[adapter.id];
    const venueQuotes = hasVenueQuotes(adapter) ? await adapter.getVenueQuotes(symbol) : [];
    const opp = findOpportunity({ venueQuotes, costs });
    const trade: TradeRecord = {
      market: adapter.id,
      strategy: sig.strategy,
      symbol,
      currency: adapter.currency,
      side: 'arb',
      status: 'failed',
      quantity,
      refPrice: opp?.buyPrice ?? sig.price,
      fillPrice: 0,
      fees: 0,
      taxes: 0,
      spreadCost: 0,
      slippageCost: 0,
      pnl: 0,
      reason: sig.reason,
      time: this.now(),
    };
    if (!opp || opp.netEdgePct <= 0) {
      await this.store.insertSignal({ ...sig, skipReason: 'Gap closed before execution' });
      return wallet;
    }
    // Either leg can fail independently; treat any failure as a failed round trip.
    if (rollFailure(costs, this.rng) || rollFailure(costs, this.rng)) {
      await this.recordFailure(trade, sig, 'Simulated leg rejection');
      return wallet;
    }
    const qty = Math.min(quantity, wallet.cash / (opp.buyPrice * 1.01));
    const buy = estimateCosts({ side: 'buy', symbol, quantity: qty, price: opp.buyPrice }, costs);
    const sell = estimateCosts({ side: 'sell', symbol, quantity: qty, price: opp.sellPrice }, costs);
    const pnl = sell.notional - sell.total - (buy.notional + buy.total);
    const filled = await this.store.insertTrade({
      ...trade,
      status: 'filled',
      quantity: qty,
      fillPrice: buy.fillPrice,
      fees: buy.fees + sell.fees,
      taxes: buy.taxes + sell.taxes,
      spreadCost: buy.spreadCost + sell.spreadCost,
      slippageCost: buy.slippageCost + sell.slippageCost,
      pnl,
      reason: `${sig.reason}; filled buy ${opp.buyVenue} / sell ${opp.sellVenue}`,
    });
    await this.store.insertSignal({ ...sig, taken: true });
    this.emit('trade:new', filled);
    return {
      ...wallet,
      cash: wallet.cash + pnl,
      realizedPnl: wallet.realizedPnl + pnl,
      feesPaid: wallet.feesPaid + buy.fees + sell.fees,
      taxesPaid: wallet.taxesPaid + buy.taxes + sell.taxes,
    };
  }

  private async recordFailure(trade: TradeRecord, sig: SignalRecord, why: string) {
    const rec = await this.store.insertTrade({ ...trade, status: 'failed', reason: `${trade.reason} — FAILED: ${why}` });
    await this.store.insertSignal({ ...sig, skipReason: why });
    this.emit('trade:new', rec);
  }

  private reportBreach(market: MarketId, strategy: string, block: RiskBlock) {
    if (block !== 'daily_loss_limit') return;
    const key = `${dayKey(this.now())}:${market}:${strategy}`;
    if (this.breachedToday.has(key)) return;
    this.breachedToday.add(key);
    this.emit('risk:breach', { market, strategy, block } satisfies RiskBreachEvent);
  }

  /** Mark every wallet in this market to the latest prices and track drawdown. */
  private async markWallets(adapter: MarketAdapter, strategies: Strategy[]) {
    const prices = this.marketPrices(adapter.id);
    for (const s of strategies) {
      const w = await this.loadWallet(adapter, s.id);
      const eq = equity(w, prices);
      const updated: WalletRecord = { ...w, ...updateDrawdown(w, eq) };
      await this.store.saveWallet(updated);
      this.emit('wallet:update', { ...updated, equity: eq });
    }
  }

  private async emitStatus() {
    try {
      this.emit('bot:status', await this.status());
    } catch (err) {
      logger.warn({ err: String(err) }, 'status emit failed');
    }
  }
}

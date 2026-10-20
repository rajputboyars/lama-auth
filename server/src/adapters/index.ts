import type { Env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { DEFAULT_COSTS } from '../services/costModel.js';
import type { MarketId } from '../types.js';
import { AlpacaProvider } from './alpaca.js';
import { CryptoAdapter, createExchanges } from './crypto.js';
import { createIndiaProvider } from './india/index.js';
import { SESSIONS } from './marketHours.js';
import { ProviderAdapter } from './providerAdapter.js';
import type { MarketAdapter } from './types.js';
import { YahooProvider } from './yahoo.js';

/** Builds every configured market. A market that fails to build is logged and left out. */
export function createAdapters(env: Env): Map<MarketId, MarketAdapter> {
  const adapters = new Map<MarketId, MarketAdapter>();
  const tryAdd = (id: MarketId, build: () => MarketAdapter) => {
    try {
      adapters.set(id, build());
    } catch (err) {
      logger.error({ market: id, err: String(err) }, 'market adapter disabled');
    }
  };

  tryAdd('crypto', () => new CryptoAdapter(createExchanges(env.CRYPTO_EXCHANGES), env.CRYPTO_SYMBOLS, DEFAULT_COSTS.crypto));

  tryAdd('us', () => {
    const provider =
      env.ALPACA_KEY_ID && env.ALPACA_SECRET_KEY
        ? new AlpacaProvider(env.ALPACA_KEY_ID, env.ALPACA_SECRET_KEY, env.ALPACA_DATA_FEED)
        : new YahooProvider();
    if (provider.name === 'yahoo') logger.warn('No Alpaca keys: US market uses delayed Yahoo data');
    return new ProviderAdapter(provider, {
      id: 'us',
      name: 'US Stocks',
      currency: 'USD',
      session: SESSIONS.us,
      symbols: env.US_SYMBOLS,
      tickMs: 30_000,
      costs: DEFAULT_COSTS.us,
    });
  });

  tryAdd(
    'india',
    () =>
      new ProviderAdapter(createIndiaProvider(env), {
        id: 'india',
        name: 'India NSE',
        currency: 'INR',
        session: SESSIONS.india,
        symbols: env.INDIA_SYMBOLS,
        tickMs: 30_000,
        costs: DEFAULT_COSTS.india,
      }),
  );

  tryAdd(
    'global',
    () =>
      new ProviderAdapter(new YahooProvider(), {
        id: 'global',
        name: 'Global (USD-quoted)',
        currency: 'USD',
        session: SESSIONS.global,
        symbols: env.GLOBAL_SYMBOLS,
        tickMs: 60_000,
        costs: DEFAULT_COSTS.global,
      }),
  );

  return adapters;
}

import type { Env } from '../../config/env.js';
import type { PriceProvider } from '../yahoo.js';
import { YahooProvider } from '../yahoo.js';
import { KiteProvider } from './kite.js';
import { NotImplementedProvider } from './notImplemented.js';

/** Picks the Indian data broker from INDIA_BROKER. Any PriceProvider can be swapped in here. */
export function createIndiaProvider(env: Env): PriceProvider {
  switch (env.INDIA_BROKER) {
    case 'kite':
      if (!env.KITE_API_KEY || !env.KITE_ACCESS_TOKEN) {
        throw new Error('INDIA_BROKER=kite needs KITE_API_KEY and KITE_ACCESS_TOKEN');
      }
      return new KiteProvider(env.KITE_API_KEY, env.KITE_ACCESS_TOKEN);
    case 'upstox':
      return new NotImplementedProvider('upstox');
    case 'angel':
      return new NotImplementedProvider('angel');
    case 'yahoo':
    default:
      return new YahooProvider((s) => (s.includes('.') ? s : `${s}.NS`));
  }
}

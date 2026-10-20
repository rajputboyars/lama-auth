import { fillPriceFor } from '../services/costModel.js';
import { type Strategy, wait, withDefaults } from './types.js';

export interface ArbOpportunity {
  buyVenue: string;
  sellVenue: string;
  buyPrice: number;
  sellPrice: number;
  netEdgePct: number;
}

/**
 * Cross-exchange arbitrage (crypto only). 'buy' here means: buy on the cheap venue and sell
 * on the expensive venue at the same moment. The edge must survive fees, spread and slippage
 * on BOTH legs plus a safety margin (transfer and rebalancing costs are not free in reality).
 */
export const arbitrage: Strategy = {
  id: 'arbitrage',
  name: 'Bridge Runner',
  description:
    'Cross-exchange arbitrage: trades only when the price gap between two exchanges beats all round-trip costs plus a safety margin.',
  markets: ['crypto'],
  backtestable: false,
  params: [
    { key: 'minEdgePct', label: 'Min net edge %', min: 0.05, max: 5, step: 0.05, default: 0.3 },
  ],
  minCandles: () => 0,
  check(_candles, _position, params, ctx) {
    const { minEdgePct } = withDefaults(this.params, params);
    const opp = findOpportunity(ctx);
    if (!opp) return wait('Need quotes from at least 2 exchanges');
    if (opp.netEdgePct < minEdgePct)
      return wait(`Net edge ${opp.netEdgePct.toFixed(3)}% after costs < ${minEdgePct}%`);
    return {
      action: 'buy',
      reason: `Buy on ${opp.buyVenue} @${opp.buyPrice}, sell on ${opp.sellVenue} @${opp.sellPrice} (net ${opp.netEdgePct.toFixed(3)}%)`,
    };
  },
};

export function findOpportunity(ctx: Parameters<Strategy['check']>[3]): ArbOpportunity | null {
  const quotes = ctx?.venueQuotes ?? [];
  if (quotes.length < 2 || !ctx?.costs) return null;
  const cheap = quotes.reduce((a, b) => (b.price < a.price ? b : a));
  const dear = quotes.reduce((a, b) => (b.price > a.price ? b : a));
  const buyFill = fillPriceFor('buy', cheap.price, ctx.costs);
  const sellFill = fillPriceFor('sell', dear.price, ctx.costs);
  const feeFrac = (2 * ctx.costs.feePct) / 100;
  const netEdgePct = ((sellFill - buyFill) / buyFill - feeFrac) * 100;
  return {
    buyVenue: cheap.source,
    sellVenue: dear.source,
    buyPrice: cheap.price,
    sellPrice: dear.price,
    netEdgePct,
  };
}

import { useLive } from '../hooks/live';
import { MARKET_LABEL, price } from '../lib/format';

export function PriceTicker() {
  const { prices } = useLive();
  const items = Object.values(prices);
  if (items.length === 0) {
    return (
      <div className="panel text-sm text-slate-500">
        Waiting for live prices… start the bot to stream quotes.
      </div>
    );
  }
  const row = items.map((p) => {
    const up = p.prev === undefined ? null : p.price >= p.prev;
    return (
      <span
        key={`${p.market}:${p.symbol}`}
        className="mx-5 inline-flex items-center gap-2 whitespace-nowrap"
      >
        <span className="text-[10px] uppercase text-slate-500">{MARKET_LABEL[p.market]}</span>
        <span className="font-semibold text-slate-200">{p.symbol}</span>
        <span className={`num ${up === null ? 'text-slate-300' : up ? 'text-win' : 'text-loss'}`}>
          {price(p.price)} {up === null ? '' : up ? '▲' : '▼'}
        </span>
      </span>
    );
  });
  return (
    <div className="panel overflow-hidden py-2" aria-label="Live prices">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {row}
        <span aria-hidden>{row}</span>
      </div>
    </div>
  );
}

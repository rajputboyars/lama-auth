import { useLive } from '@/hooks/live';
import { useLang } from '@/i18n';
import { MARKET_LABEL, price } from '@/lib/format';
import { cn } from '@/lib/utils';

export function PriceTicker() {
  const { prices } = useLive();
  const { t } = useLang();
  const items = Object.values(prices);
  if (items.length === 0) {
    return <div className="panel py-3 text-sm text-muted-foreground">{t('ticker.waiting')}</div>;
  }
  const row = items.map((p) => {
    const up = p.prev === undefined ? null : p.price >= p.prev;
    return (
      <span
        key={`${p.market}:${p.symbol}`}
        className="mx-5 inline-flex items-center gap-2 whitespace-nowrap"
      >
        <span className="text-xs text-muted-foreground">{MARKET_LABEL[p.market]}</span>
        <span className="font-semibold">{p.symbol}</span>
        <span
          className={cn('num', up === null ? 'text-foreground' : up ? 'text-win' : 'text-loss')}
        >
          {price(p.price)} {up === null ? '' : up ? '▲' : '▼'}
        </span>
      </span>
    );
  });
  return (
    <div className="panel overflow-hidden py-3" aria-label={t('ticker.label')}>
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {row}
        <span aria-hidden>{row}</span>
      </div>
    </div>
  );
}

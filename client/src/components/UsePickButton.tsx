import { Swords } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLang } from '@/i18n';
import { api } from '@/lib/api';
import { MARKET_LABEL } from '@/lib/format';
import { ErrorNote } from './common';

/** "Use as my pick": sets this strategy as the user's side in You vs Bot for a chosen market. */
export function UsePickButton({ strategy }: { strategy: string }) {
  const { t } = useLang();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  async function choose(market: string) {
    setError(null);
    try {
      await api(`/duel/${market}`, { method: 'PUT', body: { userStrategy: strategy } });
      navigate(`/vs?market=${market}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm">
          <Swords /> {t('guide.usePick')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-2">
        <p className="text-sm font-semibold">{t('guide.whichMarket')}</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(MARKET_LABEL).map(([id, label]) => (
            <Button key={id} variant="outline" size="sm" onClick={() => choose(id)}>
              {label}
            </Button>
          ))}
        </div>
        <ErrorNote error={error} />
      </PopoverContent>
    </Popover>
  );
}

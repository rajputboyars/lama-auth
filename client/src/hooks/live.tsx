import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { type Socket, io } from 'socket.io-client';
import type { BotStatus, PriceUpdate, Trade } from '../lib/types';
import { playTradeSound } from '../lib/sound';

export interface Toast {
  id: number;
  kind: 'xp' | 'achievement' | 'error';
  title: string;
  body?: string;
  icon?: string;
}

interface LiveCtx {
  connected: boolean;
  status: BotStatus | null;
  /** `prev` is the previous tick, `first` the first price seen since the page opened. */
  prices: Record<string, PriceUpdate & { prev?: number; first?: number }>;
  trades: Trade[];
  toasts: Toast[];
  soundOn: boolean;
  setSoundOn(v: boolean): void;
  dismiss(id: number): void;
  setStatus(s: BotStatus): void;
  walletTick: number;
  /** Latest marked-to-market equity per `market:strategy` wallet, from live wallet updates. */
  equities: Record<string, { equity: number; time: number }>;
}

const Ctx = createContext<LiveCtx | null>(null);
const MAX_TRADES = 100;

function readSoundPref(): boolean {
  try {
    return localStorage.getItem('paperbot.sound') === 'on';
  } catch {
    return false;
  }
}

export function LiveProvider({ token, children }: { token: string; children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [prices, setPrices] = useState<LiveCtx['prices']>({});
  const [trades, setTrades] = useState<Trade[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [soundOn, setSoundState] = useState(readSoundPref);
  const [walletTick, setWalletTick] = useState(0);
  const [equities, setEquities] = useState<LiveCtx['equities']>({});
  const soundRef = useRef(soundOn);
  const nextId = useRef(1);

  const setSoundOn = useCallback((v: boolean) => {
    soundRef.current = v;
    setSoundState(v);
    try {
      localStorage.setItem('paperbot.sound', v ? 'on' : 'off');
    } catch {
      /* ignore */
    }
  }, []);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = nextId.current++;
    setToasts((xs) => [...xs.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), 5000);
  }, []);

  useEffect(() => {
    const socket: Socket = io({ auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('bot:status', setStatus);
    socket.on('price:update', (p: PriceUpdate) =>
      setPrices((m) => {
        const key = `${p.market}:${p.symbol}`;
        return { ...m, [key]: { ...p, prev: m[key]?.price, first: m[key]?.first ?? p.price } };
      }),
    );
    socket.on('trade:new', (t: Trade) => {
      setTrades((xs) => [t, ...xs].slice(0, MAX_TRADES));
      if (soundRef.current)
        playTradeSound(t.status === 'failed' ? 'fail' : t.pnl < 0 ? 'loss' : 'win');
    });
    socket.on('wallet:update', (w: { market: string; strategy: string; equity: number }) => {
      setWalletTick((n) => n + 1);
      setEquities((m) => ({
        ...m,
        [`${w.market}:${w.strategy}`]: { equity: w.equity, time: Date.now() },
      }));
    });
    socket.on('game:xp', (e: { amount: number; reason: string }) =>
      push({ kind: 'xp', title: `+${e.amount} XP`, body: e.reason }),
    );
    socket.on('game:achievement', (e: { name: string; description: string; icon: string }) =>
      push({
        kind: 'achievement',
        title: `Achievement: ${e.name}`,
        body: e.description,
        icon: e.icon,
      }),
    );
    return () => {
      socket.disconnect();
    };
  }, [token, push]);

  const dismiss = useCallback((id: number) => setToasts((xs) => xs.filter((x) => x.id !== id)), []);

  return (
    <Ctx.Provider
      value={{
        connected,
        status,
        prices,
        trades,
        toasts,
        soundOn,
        setSoundOn,
        dismiss,
        setStatus,
        walletTick,
        equities,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useLive(): LiveCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLive outside LiveProvider');
  return c;
}

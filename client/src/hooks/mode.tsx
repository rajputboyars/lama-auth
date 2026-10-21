import { type ReactNode, createContext, useCallback, useContext, useState } from 'react';

export type Mode = 'simple' | 'expert';
const KEY = 'paperbot.mode';

function readMode(): Mode {
  try {
    return localStorage.getItem(KEY) === 'expert' ? 'expert' : 'simple';
  } catch {
    return 'simple';
  }
}

interface ModeCtx {
  mode: Mode;
  /** True in Simple mode: fewer pages, fewer numbers. */
  simple: boolean;
  setMode(m: Mode): void;
}

const Ctx = createContext<ModeCtx | null>(null);

/** Simple mode (the default) hides advanced pages and numbers until the user asks for them. */
export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setState] = useState<Mode>(readMode);
  const setMode = useCallback((m: Mode) => {
    setState(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* storage unavailable: choice lasts until reload */
    }
  }, []);
  return (
    <Ctx.Provider value={{ mode, simple: mode === 'simple', setMode }}>{children}</Ctx.Provider>
  );
}

export function useMode(): ModeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useMode outside ModeProvider');
  return c;
}

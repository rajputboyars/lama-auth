import { type ReactNode, createContext, useCallback, useContext, useState } from 'react';

const KEY = 'paperbot.onboarded';

function wasOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

interface WizardCtx {
  open: boolean;
  openWizard(): void;
  /** Closes the wizard and remembers it was seen, so it does not pop up again. */
  closeWizard(): void;
}

const Ctx = createContext<WizardCtx | null>(null);

/** First-time setup wizard state. Opens by itself until the user has seen it once. */
export function WizardProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(() => !wasOnboarded());
  const openWizard = useCallback(() => setOpen(true), []);
  const closeWizard = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* storage unavailable: it may show again next visit */
    }
  }, []);
  return <Ctx.Provider value={{ open, openWizard, closeWizard }}>{children}</Ctx.Provider>;
}

export function useWizard(): WizardCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useWizard outside WizardProvider');
  return c;
}

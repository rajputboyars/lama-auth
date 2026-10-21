import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';
import { en } from './en';
import { hinglish } from './hinglish';

export type Lang = 'en' | 'hinglish';
export type TKey = keyof typeof en;
/** A piece of long-form content written in both languages. */
export interface Bi {
  en: string;
  hinglish: string;
}

const DICTS: Record<Lang, Record<TKey, string>> = { en, hinglish };
const KEY = 'paperbot.lang';

function readLang(): Lang {
  try {
    return localStorage.getItem(KEY) === 'hinglish' ? 'hinglish' : 'en';
  } catch {
    return 'en';
  }
}

interface LangCtx {
  lang: Lang;
  setLang(l: Lang): void;
  /** UI string by key; `{name}` placeholders are filled from `vars`. */
  t(key: TKey, vars?: Record<string, string | number>): string;
  /** Picks the current language from a bilingual content block. */
  pick(b: Bi): string;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* storage unavailable: choice lasts until reload */
    }
  }, []);

  const value = useMemo<LangCtx>(() => {
    const dict = DICTS[lang];
    return {
      lang,
      setLang,
      t: (key, vars) => {
        const s = dict[key] ?? en[key] ?? key;
        return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`)) : s;
      },
      pick: (b) => b[lang] || b.en,
    };
  }, [lang, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLang outside LangProvider');
  return c;
}

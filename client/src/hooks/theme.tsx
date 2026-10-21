import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'paperbot.theme';

function readTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export interface ChartColors {
  win: string;
  loss: string;
  primary: string;
  text: string;
  muted: string;
  grid: string;
  card: string;
  border: string;
  warn: string;
}

interface ThemeCtx {
  theme: Theme;
  toggle(): void;
  /** Concrete colors for canvas/SVG charts, refreshed whenever the theme changes. */
  colors: ChartColors;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [colors, setColors] = useState<ChartColors>(() => {
    document.documentElement.classList.toggle('dark', readTheme() === 'dark');
    return readColors();
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0d0f17' : '#f7f8fc');
    setColors(readColors());
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return <Ctx.Provider value={{ theme, toggle, colors }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme outside ThemeProvider');
  return c;
}

export const useChartColors = (): ChartColors => useTheme().colors;

/** Resolves a theme token to an `rgb()`/`rgba()` string that canvas chart libraries can parse. */
function varColor(name: string, alpha = 1): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  if (!v) return '#888888';
  const probe = document.createElement('span');
  probe.style.color = `hsl(${v} / ${alpha})`;
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  return rgb;
}

function readColors(): ChartColors {
  return {
    win: varColor('win'),
    loss: varColor('loss'),
    primary: varColor('primary'),
    text: varColor('foreground'),
    muted: varColor('muted-foreground'),
    grid: varColor('border', 0.7),
    card: varColor('card'),
    border: varColor('border'),
    warn: varColor('warn'),
  };
}

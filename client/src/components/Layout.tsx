import {
  ChartColumn,
  BookOpen,
  ChartCandlestick,
  FlaskConical,
  Earth,
  GraduationCap,
  Receipt,
  House,
  LogOut,
  type LucideIcon,
  Menu,
  Moon,
  Settings as SettingsIcon,
  Sun,
  Swords,
  Trophy,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/auth';
import { useLive } from '@/hooks/live';
import { useTheme } from '@/hooks/theme';
import { type Lang, type TKey, useLang } from '@/i18n';
import { cn } from '@/lib/utils';
import { LiveDot } from './common';
import { Toasts } from './Toasts';

interface NavItem {
  to: string;
  label: TKey;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar; the rest live in the "More" sheet. */
  primary?: boolean;
}

const NAV: { group: TKey; items: NavItem[] }[] = [
  {
    group: 'nav.group.trade',
    items: [
      { to: '/', label: 'nav.home', icon: House, primary: true },
      { to: '/charts', label: 'nav.charts', icon: ChartCandlestick, primary: true },
      { to: '/vs', label: 'nav.vs', icon: Swords, primary: true },
      { to: '/feed', label: 'nav.feed', icon: Receipt },
      { to: '/markets', label: 'nav.markets', icon: Earth },
    ],
  },
  {
    group: 'nav.group.learn',
    items: [
      { to: '/learn/terms', label: 'nav.terms', icon: BookOpen, primary: true },
      { to: '/learn/strategies', label: 'nav.strategies', icon: GraduationCap },
      { to: '/lab', label: 'nav.lab', icon: FlaskConical },
      { to: '/arena', label: 'nav.arena', icon: ChartColumn },
    ],
  },
  {
    group: 'nav.group.you',
    items: [
      { to: '/achievements', label: 'nav.rewards', icon: Trophy },
      { to: '/settings', label: 'nav.settings', icon: SettingsIcon },
    ],
  },
];

const ALL = NAV.flatMap((g) => g.items);

function Brand() {
  const { t } = useLang();
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
        <ChartCandlestick className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <div className="font-display text-base font-extrabold tracking-tight">
          {t('brand.name')}
        </div>
        <div className="text-[11px] text-muted-foreground">{t('brand.tagline')}</div>
      </div>
    </div>
  );
}

function Preferences({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const { lang, setLang, t } = useLang();
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <ToggleGroup
        type="single"
        value={lang}
        onValueChange={(v) => v && setLang(v as Lang)}
        aria-label={t('pref.language')}
        className="p-0.5"
      >
        <ToggleGroupItem value="en" className="h-7 px-2.5">
          EN
        </ToggleGroupItem>
        <ToggleGroupItem value="hinglish" className="h-7 px-2.5">
          Hinglish
        </ToggleGroupItem>
      </ToggleGroup>
      <Button
        variant="outline"
        size="icon"
        onClick={toggle}
        aria-label={theme === 'dark' ? t('pref.light') : t('pref.dark')}
        title={theme === 'dark' ? t('pref.light') : t('pref.dark')}
      >
        {theme === 'dark' ? <Sun /> : <Moon />}
      </Button>
    </div>
  );
}

function SideLink({ item }: { item: NavItem }) {
  const { t } = useLang();
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/10 font-semibold text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {t(item.label)}
    </NavLink>
  );
}

export function Layout() {
  const { logout } = useAuth();
  const { status, connected } = useLive();
  const { t } = useLang();
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const running = !!status?.running;
  const current = ALL.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)));

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card/60 px-3 py-5 backdrop-blur md:flex">
          <div className="mb-6 px-2">
            <Brand />
          </div>
          <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
            {NAV.map((g) => (
              <div key={g.group} className="flex flex-col gap-0.5">
                <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {t(g.group)}
                </div>
                {g.items.map((n) => (
                  <SideLink key={n.to} item={n} />
                ))}
              </div>
            ))}
          </nav>
          <div className="mt-4 space-y-3 rounded-2xl border bg-background/60 p-3">
            <LiveDot on={running} label={running ? t('bot.running') : t('bot.stopped')} />
            <div className="text-xs text-muted-foreground">
              {connected ? t('socket.connected') : t('socket.reconnecting')}
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={logout}>
              <LogOut /> {t('auth.logout')}
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur md:px-8">
            <div className="md:hidden">
              <Brand />
            </div>
            <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
              {current && <current.icon className="h-4 w-4" />}
              {current && t(current.label)}
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex">
                <LiveDot on={running} label={running ? t('bot.running') : t('bot.stopped')} />
              </span>
              <Preferences />
            </div>
          </header>
          <main className="px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-8">
            <Outlet />
          </main>
        </div>

        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t bg-card/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
          aria-label={t('nav.main')}
        >
          {ALL.filter((n) => n.primary).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg py-1 text-[11px] font-medium',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <n.icon className="h-5 w-5" />
              <span className="truncate">{t(n.label)}</span>
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg py-1 text-[11px] font-medium text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
            {t('nav.more')}
          </button>
        </nav>

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent>
            <SheetTitle>{t('nav.more')}</SheetTitle>
            <SheetDescription className="mb-4">{t('nav.moreHint')}</SheetDescription>
            <div className="space-y-4" onClick={() => setMoreOpen(false)}>
              {NAV.map((g) => (
                <div key={g.group} className="space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(g.group)}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {g.items.map((n) => (
                      <SideLink key={n.to} item={n} />
                    ))}
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={logout}>
                <LogOut /> {t('auth.logout')}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <Toasts />
      </div>
    </TooltipProvider>
  );
}

import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/auth';
import { useLive } from '../hooks/live';
import { LiveDot } from './ui';
import { Toasts } from './Toasts';

const NAV = [
  { to: '/', label: 'Command', icon: '◎' },
  { to: '/feed', label: 'Battle Feed', icon: '⚔' },
  { to: '/arena', label: 'Arena', icon: '♜' },
  { to: '/markets', label: 'Markets', icon: '◈' },
  { to: '/lab', label: 'Backtest Lab', icon: '⚗' },
  { to: '/achievements', label: 'Quests', icon: '★' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export function Layout() {
  const { logout } = useAuth();
  const { status, connected } = useLive();
  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px]">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-edge px-3 py-5 md:flex">
        <div className="mb-6 px-2">
          <div className="font-display text-lg font-black tracking-wider text-neon-cyan">
            PAPER//CMD
          </div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
            fake money · real prices
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${isActive ? 'bg-neon-cyan/10 text-neon-cyan shadow-glow' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`
              }
            >
              <span className="w-5 text-center">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3 px-2">
          <LiveDot on={!!status?.running} label={status?.running ? 'BOT LIVE' : 'BOT STOPPED'} />
          <div className="text-[11px] text-slate-500">
            {connected ? 'Socket connected' : 'Socket reconnecting…'}
          </div>
          <button className="btn-ghost w-full py-1 text-xs" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-edge bg-void/80 px-4 py-3 backdrop-blur md:hidden">
          <span className="font-display font-black tracking-wider text-neon-cyan">PAPER//CMD</span>
          <div className="flex items-center gap-3">
            <LiveDot on={!!status?.running} label={status?.running ? 'LIVE' : 'OFF'} />
            <button className="text-xs text-slate-400" onClick={logout}>
              Log out
            </button>
          </div>
        </header>
        <main className="px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-8">
          <Outlet />
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-edge bg-void/95 px-1 py-2 backdrop-blur md:hidden"
        aria-label="Main"
      >
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg py-1 text-[10px] ${isActive ? 'text-neon-cyan' : 'text-slate-500'}`
            }
          >
            <span className="text-base leading-none">{n.icon}</span>
            <span className="truncate">{n.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
      <Toasts />
    </div>
  );
}

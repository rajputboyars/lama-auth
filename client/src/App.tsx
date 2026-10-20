import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuth } from './hooks/auth';
import { LiveProvider } from './hooks/live';
import { Achievements } from './pages/Achievements';
import { BacktestLab } from './pages/BacktestLab';
import { BattleFeed } from './pages/BattleFeed';
import { CommandCenter } from './pages/CommandCenter';
import { Login } from './pages/Login';
import { MarketsMap } from './pages/MarketsMap';
import { Settings } from './pages/Settings';
import { StrategyArena } from './pages/StrategyArena';

export function App() {
  const { token } = useAuth();
  if (!token) return <Login />;
  return (
    <LiveProvider token={token}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<CommandCenter />} />
          <Route path="feed" element={<BattleFeed />} />
          <Route path="arena" element={<StrategyArena />} />
          <Route path="markets" element={<MarketsMap />} />
          <Route path="lab" element={<BacktestLab />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </LiveProvider>
  );
}

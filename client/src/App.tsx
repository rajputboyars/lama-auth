import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useAuth } from './hooks/auth';
import { LiveProvider } from './hooks/live';
import { Achievements } from './pages/Achievements';
import { BacktestLab } from './pages/BacktestLab';
import { BattleFeed } from './pages/BattleFeed';
import { CommandCenter } from './pages/CommandCenter';
import { Glossary } from './pages/Glossary';
import { LiveCharts } from './pages/LiveCharts';
import { Login } from './pages/Login';
import { MarketsMap } from './pages/MarketsMap';
import { Settings } from './pages/Settings';
import { StrategyArena } from './pages/StrategyArena';
import { StrategyGuide } from './pages/StrategyGuide';
import { YouVsBot } from './pages/YouVsBot';

export function App() {
  const { token } = useAuth();
  if (!token) return <Login />;
  return (
    <LiveProvider token={token}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<CommandCenter />} />
          <Route path="charts" element={<LiveCharts />} />
          <Route path="vs" element={<YouVsBot />} />
          <Route path="feed" element={<BattleFeed />} />
          <Route path="markets" element={<MarketsMap />} />
          <Route path="learn/terms" element={<Glossary />} />
          <Route path="learn/strategies" element={<StrategyGuide />} />
          <Route path="lab" element={<BacktestLab />} />
          <Route path="arena" element={<StrategyArena />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </LiveProvider>
  );
}

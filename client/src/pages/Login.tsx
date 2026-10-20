import { motion } from 'framer-motion';
import { type FormEvent, useState } from 'react';
import { ErrorNote } from '../components/ui';
import { useAuth } from '../hooks/auth';

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="panel w-full max-w-sm space-y-4 p-6 shadow-glow"
      >
        <div>
          <h1 className="font-display text-2xl font-black tracking-wider text-neon-cyan">
            PAPER//CMD
          </h1>
          <p className="text-xs text-slate-400">Paper-trading command center. Fake money only.</p>
        </div>
        <label className="block space-y-1">
          <span className="label">Username</span>
          <input
            className="input"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="block space-y-1">
          <span className="label">Password</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <ErrorNote error={error} />
        <button className="btn-primary w-full" disabled={busy || !password}>
          {busy ? 'Connecting…' : 'Enter'}
        </button>
      </motion.form>
    </div>
  );
}

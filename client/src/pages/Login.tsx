import { motion } from 'framer-motion';
import { ChartCandlestick, GraduationCap, ShieldCheck, Swords } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { ErrorNote } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/auth';
import { useLang } from '@/i18n';

export function Login() {
  const { login } = useAuth();
  const { t } = useLang();
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
      setError(err instanceof Error ? err.message : t('login.failed'));
    } finally {
      setBusy(false);
    }
  }

  const points = [
    { icon: ShieldCheck, text: t('login.point1') },
    { icon: GraduationCap, text: t('login.point2') },
    { icon: Swords, text: t('login.point3') },
  ];

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 font-display text-lg font-extrabold">
          <ChartCandlestick className="h-6 w-6" /> {t('brand.name')}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight">
            {t('login.hero')}
          </h1>
          <ul className="space-y-3 text-lg opacity-90">
            {points.map((p) => (
              <li key={p.text} className="flex items-center gap-3">
                <p.icon className="h-5 w-5 shrink-0" /> {p.text}
              </li>
            ))}
          </ul>
        </motion.div>
        <p className="text-sm opacity-75">{t('login.footer')}</p>
      </div>

      <div className="grid place-items-center px-4 py-12">
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="panel w-full max-w-sm space-y-5 p-6 md:p-8"
        >
          <div className="space-y-1">
            <h2 className="font-display text-2xl font-extrabold">{t('login.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t('login.username')}</span>
            <Input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t('login.password')}</span>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <ErrorNote error={error} />
          <Button className="w-full" size="lg" disabled={busy || !password}>
            {busy ? t('login.busy') : t('login.submit')}
          </Button>
        </motion.form>
      </div>
    </div>
  );
}

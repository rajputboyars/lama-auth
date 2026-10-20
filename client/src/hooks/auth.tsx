import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from '../lib/api';

interface AuthCtx {
  token: string | null;
  login(username: string, password: string): Promise<void>;
  logout(): void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTok] = useState<string | null>(getToken);

  const logout = useCallback(() => {
    setToken(null);
    setTok(null);
  }, []);

  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  const login = useCallback(async (username: string, password: string) => {
    const { token: t } = await api<{ token: string }>('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    setToken(t);
    setTok(t);
  }, []);

  return <Ctx.Provider value={{ token, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}

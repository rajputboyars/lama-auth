const TOKEN_KEY = 'paperbot.token';

/**
 * Where the API server lives. Empty (the default) means the same site, as with Docker/nginx.
 * Set VITE_API_URL when the dashboard is hosted apart from the API, e.g. on Vercel.
 */
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: session lasts until reload */
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

export async function api<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api${path}`, {
    method: init.method ?? 'GET',
    headers: {
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/auth/login') onUnauthorized();
  if (!res.ok) {
    const details = Array.isArray(data.details)
      ? `: ${data.details.map((d: { message: string }) => d.message).join(', ')}`
      : '';
    throw new ApiError(res.status, (data.error ?? `Request failed (${res.status})`) + details);
  }
  return data as T;
}

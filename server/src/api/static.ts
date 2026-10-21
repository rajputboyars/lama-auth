import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';

/** Files that must always be re-checked, or an installed app keeps running an old version. */
const NO_CACHE = new Set(['index.html', 'sw.js', 'manifest.webmanifest', 'registerSW.js']);

/**
 * Serves the built dashboard from `dir` on the same origin as the API, so the whole app
 * deploys as one service. Hashed build assets are cached for a year; everything else is
 * re-validated. Unknown non-API paths get index.html so the React router can handle them.
 */
export function serveDashboard(app: Express, dir: string): boolean {
  const root = path.resolve(dir);
  const index = path.join(root, 'index.html');
  if (!existsSync(index)) return false;

  app.use(
    express.static(root, {
      index: false,
      setHeaders(res, file) {
        const name = path.basename(file);
        if (NO_CACHE.has(name)) res.setHeader('Cache-Control', 'no-cache');
        else if (file.includes(`${path.sep}assets${path.sep}`))
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }),
  );
  app.get(/^\/(?!api\/|api$|socket\.io\/).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(index);
  });
  return true;
}

/**
 * Content Security Policy that lets the dashboard run: its own scripts, Google Fonts,
 * inline styles from the chart libraries, live sockets and the service worker.
 */
export const DASHBOARD_CSP = {
  useDefaults: true,
  directives: {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    'img-src': ["'self'", 'data:', 'blob:'],
    'connect-src': [
      "'self'",
      'ws:',
      'wss:',
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
    ],
    'worker-src': ["'self'"],
    'manifest-src': ["'self'"],
    // Local runs are plain http; Render terminates https in front of us.
    'upgrade-insecure-requests': null,
  },
};

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import type { MarketAdapter } from '../src/adapters/types.js';
import { createApp } from '../src/api/app.js';
import { BotEngine } from '../src/bot/engine.js';
import { MemoryStore } from '../src/store/memoryStore.js';
import type { MarketId } from '../src/types.js';
import { FakeAdapter } from './helpers.js';

const dir = mkdtempSync(path.join(tmpdir(), 'paperbot-dist-'));
mkdirSync(path.join(dir, 'assets'));
writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>Paper Trading Coach</title>');
writeFileSync(path.join(dir, 'assets', 'index-abc123.js'), 'console.log(1)');
writeFileSync(path.join(dir, 'sw.js'), 'self.skipWaiting()');
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function build(staticDir?: string) {
  const store = new MemoryStore();
  const adapters = new Map<MarketId, MarketAdapter>([['crypto', new FakeAdapter()]]);
  const engine = new BotEngine(adapters, store, { maxTickJumpPct: 10, sleep: async () => {} });
  return createApp({
    store,
    engine,
    game: { record: async () => {} } as never,
    adapters,
    auth: { jwtSecret: 'z'.repeat(40), username: 'admin', passwordHash: bcrypt.hashSync('pw', 4) },
    clientOrigin: 'http://localhost:5173',
    staticDir,
  });
}

describe('one-service deploy: the API serves the dashboard', () => {
  const app = build(dir);

  it('serves index.html for the home page and for app routes', async () => {
    for (const p of ['/', '/charts', '/learn/terms']) {
      const res = await request(app).get(p);
      expect(res.status).toBe(200);
      expect(res.text).toContain('Paper Trading Coach');
      expect(res.headers['cache-control']).toBe('no-cache');
    }
  });

  it('caches hashed assets for a long time but never the service worker', async () => {
    const asset = await request(app).get('/assets/index-abc123.js');
    expect(asset.headers['cache-control']).toContain('immutable');
    const sw = await request(app).get('/sw.js');
    expect(sw.headers['cache-control']).toBe('no-cache');
  });

  it('keeps API answers as JSON, including unknown API paths', async () => {
    expect((await request(app).get('/api/health')).body).toEqual({
      ok: true,
      paperTradingOnly: true,
    });
    // Unknown API paths still get a JSON error (401 before login), never the dashboard page.
    const missing = await request(app).get('/api/does-not-exist');
    expect(missing.status).toBeGreaterThanOrEqual(400);
    expect(missing.headers['content-type']).toContain('application/json');
    expect(missing.text).not.toContain('Paper Trading Coach');
  });

  it('sends a CSP that allows the dashboard fonts and live sockets', async () => {
    const csp = (await request(app).get('/')).headers['content-security-policy'];
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain('https://fonts.gstatic.com');
    expect(csp).toContain('wss:');
  });

  it('does not serve pages when no dashboard folder is configured', async () => {
    expect((await request(build()).get('/charts')).status).toBe(404);
  });
});

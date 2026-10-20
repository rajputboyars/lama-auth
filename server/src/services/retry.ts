export interface RetryOptions {
  retries?: number;
  baseMs?: number;
  maxMs?: number;
  onRetry?: (err: unknown, attempt: number) => void;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Exponential backoff with full jitter. */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { retries = 3, baseMs = 500, maxMs = 8000, onRetry } = opts;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) throw err;
      onRetry?.(err, attempt + 1);
      await sleep(Math.random() * Math.min(maxMs, baseMs * 2 ** attempt));
    }
  }
}

/** Serializes calls so they are at least `minIntervalMs` apart (simple per-API rate limit). */
export class RateLimiter {
  private next = 0;
  private chain: Promise<unknown> = Promise.resolve();
  constructor(private readonly minIntervalMs: number) {}

  schedule<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(async () => {
      const wait = this.next - Date.now();
      if (wait > 0) await sleep(wait);
      this.next = Date.now() + this.minIntervalMs;
      return fn();
    });
    this.chain = run.catch(() => undefined);
    return run;
  }
}

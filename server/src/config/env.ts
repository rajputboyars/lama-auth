import 'dotenv/config';
import { z } from 'zod';

const csv = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((s) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    );

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  MONGO_URI: z.string().default('mongodb://localhost:27017/paperbot'),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD_HASH: z.string().optional(),
  MAX_TICK_JUMP_PCT: z.coerce.number().positive().default(10),
  CRYPTO_EXCHANGES: csv('binance,kraken'),
  CRYPTO_SYMBOLS: csv('BTC/USDT,ETH/USDT,SOL/USDT'),
  ALPACA_KEY_ID: z.string().optional(),
  ALPACA_SECRET_KEY: z.string().optional(),
  ALPACA_DATA_FEED: z.enum(['iex', 'sip']).default('iex'),
  US_SYMBOLS: csv('AAPL,MSFT,SPY'),
  INDIA_BROKER: z.enum(['yahoo', 'kite', 'upstox', 'angel']).default('yahoo'),
  KITE_API_KEY: z.string().optional(),
  KITE_ACCESS_TOKEN: z.string().optional(),
  INDIA_SYMBOLS: csv('RELIANCE,TCS,INFY'),
  GLOBAL_SYMBOLS: csv('GC=F,CL=F,EURUSD=X'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();

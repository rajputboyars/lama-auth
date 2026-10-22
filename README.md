# Paper Command Center

A **multi-market paper-trading bot** with a gamified dashboard. It trades **fake money** against **live market prices**, charges realistic costs on every fill, and rewards discipline and learning, not profit.

> ⚠️ **Paper trading only.** Nothing in this codebase can place a real order. `server/src/live/liveBroker.ts` is a clearly marked, intentionally unimplemented interface. Paper results, including backtests, do **not** mean a strategy is profitable.

Stack: MongoDB · Express · React (Vite) · Node.js · Socket.io · TypeScript everywhere.

## Quick start

```bash
# 1. Requirements: Node 20+, Docker (for MongoDB)
npm install
docker compose up -d mongo            # MongoDB on localhost:27017 (or use MongoDB Atlas)

# 2. Configure
cp .env.example .env
#   set MONGO_URI=mongodb://localhost:27017/paperbot (or your Atlas connection string)
npm run hash-password -w server -- "choose-a-long-password"
#   put the hash in .env as ADMIN_PASSWORD_HASH='...'  (single quotes: bcrypt hashes contain $)
#   set JWT_SECRET to a random string of 32+ characters

# 3. Optional demo data (synthetic random-walk prices, labelled [DEMO])
npm run seed -- --reset

# 4. Run
npm run dev                           # API on :4000, dashboard on http://localhost:5173
```

Log in as `ADMIN_USERNAME` with your password, then press **Start bot** on the Command Center.

### Run everything in Docker

```bash
cp .env.example .env                  # set JWT_SECRET and ADMIN_PASSWORD_HASH as above
docker compose up -d --build          # Mongo + API (:4000) + dashboard on http://localhost:5173
```

The dashboard container is nginx serving the built client and proxying `/api` and `/socket.io` to the API container. The API reads `MONGO_URI` from `.env`: keep `mongodb://mongo:27017/paperbot` for the bundled Mongo container, or paste a MongoDB Atlas connection string (ending in `/paperbot`) to use the same database as your online deploy. If port 27017 is taken, set `MONGO_HOST_PORT` in `.env`.

## Pages for beginners

The dashboard is written in plain language, in Simple English or Hinglish (switch in the header), on a light screen with a dark toggle. Words with a dotted underline show a short meaning on hover or tap, with a link to the full explanation.

A first-time **setup wizard** (markets → your strategy → safety level → start) runs after the first login; reopen it from **Help** or Settings. The **Simple** view (default) hides Markets, Practice Test, Strategy Scores and advanced numbers; switch to **Expert** in the sidebar or the More menu. Every bot decision is shown in plain words (`client/src/lib/explain.ts`), with the original technical reason one click away. Safety limits come as **Careful / Balanced / Bold** presets.

| Page        | What it does                                                                                                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live Charts | Candles, OHLC bars, Heikin-Ashi, line, area and baseline charts; 1m to 1d candles; volume, moving averages and Bollinger bands; arrows where the bot traded; updates on every live tick |
| You vs Bot  | Pick a strategy per market from a dropdown. The bot runs **Bot Auto-Pilot**. Both have their own wallets; live P&L, a balance race chart and a match reset                              |
| Terms       | 50+ trading words, each with a meaning, an example with numbers and why it matters                                                                                                      |
| Strategies  | How each strategy decides, which market mood suits it, when it struggles, and the live mood per market                                                                                  |

**Bot Auto-Pilot** (`strategies/autoPilot.ts`) reads the market mood on every candle (`strategies/regime.ts`): uptrend → Trend Rider, sideways → Rubber Band, squeeze (unusually narrow Bollinger bands) → Breakout Hunter, downtrend or unclear → stay out. It sells a held position as soon as the mood turns into a downtrend. **Your Pick** (`strategies/yourPick.ts`) runs whatever you chose for that market (`settings.duel`). API: `GET /api/duel`, `PUT /api/duel/:market`, `POST /api/duel/:market/reset`, `GET /api/chart/:market/:symbol`.

### Deploy online (one service on Render)

The root `Dockerfile` builds the dashboard and the API into one image: the API also serves the dashboard, so the whole app lives at one URL with no CORS or API-address setup. The bot keeps running in the same process. Only the database is separate.

1. **Database:** create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas). Add a database user, allow network access from `0.0.0.0/0`, and copy the connection string, e.g. `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/paperbot`.
2. **Password hash:** run `npm run hash-password -w server -- "your-password"`, or reuse `ADMIN_PASSWORD_HASH` from your local `.env` to keep the same password.
3. **Render:** New → Blueprint → pick this repo (`render.yaml`). Fill in `MONGO_URI` and `ADMIN_PASSWORD_HASH`; Render generates `JWT_SECRET`. Open the service URL, e.g. `https://paper-trading-coach.onrender.com`, and log in.

On Render's free plan the service sleeps after about 15 minutes without visits, which pauses the bot. The first visit then takes up to a minute to wake it, and the bot resumes on its own.

To run the same single image locally: `docker build -t paperbot .`, then run it with `MONGO_URI`, `JWT_SECRET` and `ADMIN_PASSWORD_HASH` set and port 4000 published.

The dashboard can still be hosted on its own (e.g. Vercel, Root Directory `client`) by setting `VITE_API_URL` to the API's URL and adding the dashboard's address to the API's `CLIENT_ORIGIN`.

## Markets

| Market                     | Adapter              | Data                                                      | Keys needed                                                                                     |
| -------------------------- | -------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Crypto (any CCXT exchange) | `adapters/crypto.ts` | Live public tickers + OHLCV                               | None                                                                                            |
| US stocks                  | `adapters/alpaca.ts` | Alpaca market data (free IEX feed)                        | `ALPACA_KEY_ID`, `ALPACA_SECRET_KEY` (free paper account). Without keys it falls back to Yahoo. |
| India NSE/BSE              | `adapters/india/*`   | Kite Connect (paid data add-on) or Yahoo (`.NS`, delayed) | `INDIA_BROKER=kite` + `KITE_API_KEY`, `KITE_ACCESS_TOKEN` (expires daily)                       |
| Global (USD-quoted)        | `adapters/yahoo.ts`  | yahoo-finance2 (unofficial, delayed)                      | None                                                                                            |

Every adapter implements the same interface (`server/src/adapters/types.ts`): `getPrice`, `getCandles`, `isOpen`, `getCosts`, `listSymbols`. The engine only talks to adapters. To swap the Indian broker, implement `PriceProvider` and set `INDIA_BROKER`. Upstox and Angel One are wired in as placeholders in `adapters/india/`.

## How a paper trade happens

1. Each market runs its own loop on its own timer (crypto every 15s, stocks every 30s, global every 60s). Closed markets are skipped, using regular hours in the exchange's own timezone. Exchange holidays are not modelled.
2. A price that jumps more than `MAX_TICK_JUMP_PCT` in one tick is ignored as bad data.
3. Each enabled strategy returns `buy | sell | wait` plus a reason. Every non-wait signal is stored, whether it was taken or skipped, with the reason.
4. The risk manager sizes the trade or blocks it, based on: max % of equity, max value, daily loss limit, max open positions and the kill switch.
5. The engine waits the market's simulated delay and **re-quotes**. The order may then be rejected (`failChance`). If it fills, the fill price includes half the spread plus slippage, and fees and taxes are charged on top. A round trip at an unchanged price always loses money.
6. A market that fails backs off exponentially; the other markets keep running.

Default costs (all editable per market in Settings):

|                  | Fee                      | Taxes / levies                                                                      | Spread | Slippage | Delay | Fail |
| ---------------- | ------------------------ | ----------------------------------------------------------------------------------- | ------ | -------- | ----- | ---- |
| Crypto           | 0.1%                     | none                                                                                | 0.05%  | 0.05%    | 500ms | 1%   |
| US               | no commission            | SEC fee + FINRA TAF on sells                                                        | 0.03%  | 0.03%    | 300ms | 0.5% |
| India (delivery) | exchange + SEBI 0.00307% | STT 0.1% both sides, stamp duty 0.015% on buys, GST 18% on fees, DP ₹15.93 per sell | 0.05%  | 0.05%    | 500ms | 1%   |
| Global           | 0.1% (min 1)             | none                                                                                | 0.1%   | 0.1%     | 1s    | 1%   |

## Strategies

| Name            | File                           | Idea                                                                                                                                                                                                                                                                           |
| --------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Trend Rider     | `strategies/trendFollowing.ts` | Fast/slow SMA cross                                                                                                                                                                                                                                                            |
| Rubber Band     | `strategies/meanReversion.ts`  | RSI oversold and price below the lower Bollinger band                                                                                                                                                                                                                          |
| Breakout Hunter | `strategies/breakout.ts`       | Close above the 20-period high, exit below the 10-period low                                                                                                                                                                                                                   |
| Bridge Runner   | `strategies/arbitrage.ts`      | Cross-exchange arbitrage (crypto only). Trades only when the price gap beats the costs of both legs plus a safety margin. Transfer and rebalancing costs are **not** modelled, which flatters this strategy; that is why the margin defaults to 0.3%. It cannot be backtested. |

To add a strategy, export `{ id, name, description, markets, params, backtestable, minCandles, check }` and register it in `strategies/index.ts`. A new strategy earns XP the first time the server sees it.

The **backtester** uses the same cost model, wallet and risk manager as live paper trading. It fills at the **next** candle's open, uses a seeded random generator for failed orders, and warns when there are too few trades to mean anything. The **Strategy Arena** ranks strategies by Sharpe ratio and leaves any strategy with fewer than 30 closed trades unranked.

## Gamification (discipline, not gambling)

You earn XP for running backtests, comparing strategies on the same market, reviewing losing trades, running a strategy for 7 days, staying within risk limits for a day, and adding new strategies. Profit, trade size and trade frequency **never** earn XP.

Badges: First Backtest, Risk Guardian, Honest Trader, Scientist, Survivor, Reflective and Patient Tester. There are also daily and weekly quests.

## API

Every route except login needs an `Authorization: Bearer <jwt>` header. Inputs are validated with zod. Rate limits are 5/min for login and 300/min for everything else.

`POST /api/auth/login` · `GET /api/stats` · `GET /api/wallets` · `POST /api/wallets/reset` · `GET /api/trades?market&strategy&status&page` · `POST /api/trades/:id/review` · `GET /api/signals?market&strategy&taken&page` · `GET /api/candles/:market/:symbol?interval&limit&from&to` · `GET /api/markets` · `GET /api/strategies` · `GET|PUT /api/settings` · `POST /api/bot/start` · `POST /api/bot/stop` · `GET /api/bot/status` · `POST /api/backtest` · `GET /api/game/profile` · `GET /api/game/achievements` · `GET /api/game/quests`

Socket.io (JWT in `auth.token`): `price:update`, `trade:new`, `wallet:update`, `bot:status`, `game:xp`, `game:achievement`.

## Development

```bash
npm test          # server tests (cost model, wallet, risk, strategies, backtester, engine, game, API) + client tests
npm run lint      # ESLint
npm run format    # Prettier
npm run build     # tsc + vite build
```

```
server/src/   adapters/ strategies/ services/ bot/ game/ api/ socket/ store/ models/ live/ scripts/
server/tests/
client/src/   pages/ components/ hooks/ lib/
```

## Deployment notes

- Run with `NODE_ENV=production`. In production `JWT_SECRET` is required and logs are JSON (pino).
- Build with `npm run build`, then start the API with `node server/dist/index.js`. Serve `client/dist` from any static host or reverse proxy, and forward `/api` and `/socket.io` (with WebSocket upgrade) to the API.
- Use a managed MongoDB such as Atlas. TTL indexes expire 1-minute candles after 14 days, 5-minute candles after 60 days, and signals after 30 days. Hourly and daily candles are kept for backtests.
- Run **one** API instance only. The bot engine runs inside the API process, so two instances would both trade the same paper wallets.
- On SIGINT/SIGTERM the server stops its loops, remembers whether the bot was running, and resumes it on the next start.
- Respect each data provider's terms. Yahoo is unofficial and delayed. Kite needs a paid plan and a fresh access token every day.

## Known limitations

- Exchange holidays and half-days are not modelled. On a holiday the market looks open, but quotes don't change.
- Quantities and cash are stored as JavaScript numbers rounded to 8 decimal places, not as exact decimals.
- The Upstox and Angel One providers are placeholders.
- The Command Center balance curve is built from realized P/L. Unrealized P/L appears only in the latest point.

import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { verifyToken } from '../api/auth.js';
import type { BotEngine } from '../bot/engine.js';
import type { GameService } from '../game/gameService.js';

const ENGINE_EVENTS = ['price:update', 'trade:new', 'wallet:update', 'bot:status'] as const;
const GAME_EVENTS = ['game:xp', 'game:achievement'] as const;

/** Relays engine + game events to authenticated dashboard clients. */
export function attachSocket(http: HttpServer, engine: BotEngine, game: GameService, jwtSecret: string, origin: string) {
  const io = new Server(http, { cors: { origin } });
  io.use((socket, next) => {
    try {
      verifyToken(jwtSecret, socket.handshake.auth?.token as string | undefined);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });
  io.on('connection', async (socket) => socket.emit('bot:status', await engine.status()));
  for (const e of ENGINE_EVENTS) engine.on(e, (payload) => io.emit(e, payload));
  for (const e of GAME_EVENTS) game.on(e, (payload) => io.emit(e, payload));
  return io;
}

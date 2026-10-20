import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { HttpError, parse } from './http.js';

export interface AuthConfig {
  jwtSecret: string;
  username: string;
  passwordHash?: string;
}

export const LoginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(256),
});

const TOKEN_TTL = '12h';

export async function login(cfg: AuthConfig, body: unknown): Promise<string> {
  const { username, password } = parse(LoginSchema, body);
  if (!cfg.passwordHash)
    throw new HttpError(503, 'Admin password not configured. Set ADMIN_PASSWORD_HASH in .env');
  // Always run bcrypt so a wrong username takes as long as a wrong password.
  const ok = (await bcrypt.compare(password, cfg.passwordHash)) && username === cfg.username;
  if (!ok) throw new HttpError(401, 'Invalid username or password');
  return jwt.sign({ sub: username, role: 'admin' }, cfg.jwtSecret, { expiresIn: TOKEN_TTL });
}

export function verifyToken(secret: string, token: string | undefined): { sub: string } {
  if (!token) throw new HttpError(401, 'Missing token');
  try {
    return jwt.verify(token, secret) as { sub: string };
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
}

export function requireAuth(secret: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization;
      const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
      verifyToken(secret, token);
      next();
    } catch (err) {
      next(err);
    }
  };
}

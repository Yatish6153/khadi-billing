import type { CookieOptions, Response } from 'express';
import { env } from '../config/env';

/** Name shared with the frontend middleware (frontend/src/middleware.ts). */
export const AUTH_COOKIE = 'kb_token';

/**
 * The JWT lives in an httpOnly cookie so page scripts can never read it (XSS-safe).
 * The frontend proxies /api/* to this server, so the cookie is first-party and
 * SameSite=Lax is enough to block cross-site request forgery.
 */
const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'lax',
  path: '/',
};

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, {
    ...baseOptions,
    maxAge: env.SESSION_HOURS * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, baseOptions);
}

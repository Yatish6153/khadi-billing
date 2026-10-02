import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { verifyToken } from '../lib/jwt';
import { AUTH_COOKIE, clearAuthCookie } from '../lib/cookies';
import { AppError } from '../utils/AppError';

/** Reads the JWT from the auth cookie (browser) or a Bearer header (API clients). */
function extractToken(req: Request): string | undefined {
  const fromCookie = req.cookies?.[AUTH_COOKIE] as string | undefined;
  if (fromCookie) return fromCookie;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return undefined;
}

/**
 * Rejects the request with 401 unless it carries a valid, non-revoked token
 * for an active user. On success, `req.user` is populated.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) throw AppError.unauthorized();

  let claims;
  try {
    claims = verifyToken(token);
  } catch {
    // Clear the stale cookie so the frontend doesn't bounce between /login and /dashboard.
    clearAuthCookie(res);
    throw AppError.unauthorized('Your session has expired. Please log in again.');
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(claims.sub) },
    select: { id: true, name: true, email: true, role: true, isActive: true, tokenVersion: true },
  });

  if (!user || !user.isActive || user.tokenVersion !== claims.ver) {
    clearAuthCookie(res);
    throw AppError.unauthorized('Your session has expired. Please log in again.');
  }

  req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  next();
}

/** Use after requireAuth to restrict a route to specific roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };
}

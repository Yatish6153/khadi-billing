import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';

export interface TokenClaims {
  /** User id */
  sub: string;
  /** Must match User.tokenVersion, otherwise the token has been revoked */
  ver: number;
  role: Role;
}

export function signToken(user: { id: number; tokenVersion: number; role: Role }): string {
  return jwt.sign({ ver: user.tokenVersion, role: user.role }, env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: Math.round(env.SESSION_HOURS * 3600),
    algorithm: 'HS256',
  });
}

/** Throws if the token is invalid, expired or signed with another algorithm. */
export function verifyToken(token: string): TokenClaims {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || !decoded.sub || typeof decoded.ver !== 'number') {
    throw new Error('Malformed token');
  }
  return { sub: decoded.sub, ver: decoded.ver, role: decoded.role as Role };
}

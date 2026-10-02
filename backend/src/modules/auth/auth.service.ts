import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { signToken } from '../../lib/jwt';
import { AppError } from '../../utils/AppError';

const BCRYPT_ROUNDS = 12;

/**
 * Compared against when the email doesn't exist, so a login attempt takes
 * the same time whether or not the account exists (prevents user enumeration).
 */
const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-password', BCRYPT_ROUNDS);

export type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'lastLoginAt'>;

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    lastLoginAt: user.lastLoginAt,
  };
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk || !user.isActive) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { user: toPublicUser(updated), token: signToken(updated) };
}

export async function getCurrentUser(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthorized();
  return toPublicUser(user);
}

/**
 * Changes the password and bumps tokenVersion, which signs out every other
 * device. Returns a fresh token so the current session stays logged in.
 */
export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthorized();

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    throw AppError.badRequest('Current password is incorrect', {
      currentPassword: ['Current password is incorrect'],
    });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      tokenVersion: { increment: 1 },
    },
  });

  return { token: signToken(updated) };
}

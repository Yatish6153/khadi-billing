import type { Request, Response } from 'express';
import * as authService from './auth.service';
import { clearAuthCookie, setAuthCookie } from '../../lib/cookies';
import type { ChangePasswordInput, LoginInput } from './auth.schema';

// Express 5 forwards rejected promises to the error handler automatically,
// so controllers can simply throw.

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as LoginInput;
  const { user, token } = await authService.login(email, password);
  setAuthCookie(res, token);
  res.json({ user });
}

export function logout(_req: Request, res: Response) {
  clearAuthCookie(res);
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  const user = await authService.getCurrentUser(req.user!.id);
  res.json({ user });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body as ChangePasswordInput;
  const { token } = await authService.changePassword(req.user!.id, currentPassword, newPassword);
  setAuthCookie(res, token);
  res.json({ message: 'Password changed. Other devices have been signed out.' });
}

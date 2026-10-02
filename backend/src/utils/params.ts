import type { Request } from 'express';
import { AppError } from './AppError';

/** Reads a positive integer route param such as /customers/:id, or throws 400. */
export function idParam(req: Request, name = 'id'): number {
  const raw = req.params[name];
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw AppError.badRequest(`Invalid ${name}`);
  return id;
}

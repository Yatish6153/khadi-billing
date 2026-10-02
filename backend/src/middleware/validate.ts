import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

/**
 * Parses and sanitises `req.body` with a Zod schema. Unknown keys are stripped.
 * A ZodError is thrown on failure and turned into a 400 by the error handler.
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body ?? {});
    next();
  };
}

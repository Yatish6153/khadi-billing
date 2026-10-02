import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

interface ErrorBody {
  message: string;
  errors?: Record<string, string[]>;
  detail?: string;
}

/** Maps any thrown value to an HTTP status and a client-safe body. */
function toErrorResponse(err: unknown): { status: number; body: ErrorBody } {
  if (err instanceof AppError) {
    return { status: err.statusCode, body: { message: err.message, errors: err.errors } };
  }

  if (err instanceof ZodError) {
    const errors = err.flatten().fieldErrors as Record<string, string[]>;
    return { status: 400, body: { message: 'Please check the highlighted fields', errors } };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      // Unique constraint, e.g. a duplicate SKU or barcode: report it against that field
      const fields = (err.meta?.target as string[] | undefined) ?? [];
      const label = fields.join(', ') || 'value';
      return {
        status: 409,
        body: {
          message: `This ${label} is already used by another record`,
          errors: Object.fromEntries(fields.map((f) => [f, ['Already used by another record']])),
        },
      };
    }
    if (err.code === 'P2003') {
      return { status: 400, body: { message: 'A linked record (e.g. category) does not exist' } };
    }
    if (err.code === 'P2025') {
      return { status: 404, body: { message: 'Record not found' } };
    }
  }

  if (err instanceof MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 2 MB)' : err.message;
    return { status: 400, body: { message } };
  }

  // Malformed JSON body from express.json()
  if (err instanceof SyntaxError && 'body' in err) {
    return { status: 400, body: { message: 'Invalid JSON in request body' } };
  }

  console.error('Unhandled error:', err);
  return {
    status: 500,
    body: {
      message: 'Something went wrong. Please try again.',
      ...(env.isProd ? {} : { detail: err instanceof Error ? err.message : String(err) }),
    },
  };
}

/**
 * Central error handler. Every error response has the shape
 *   { message: string, errors?: Record<field, string[]> }
 * which the frontend's api client relies on.
 */
// Express identifies error handlers by their 4-argument signature, so _next must stay.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const { status, body } = toErrorResponse(err);
  res.status(status).json(body);
}

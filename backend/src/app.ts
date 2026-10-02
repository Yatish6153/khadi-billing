import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { apiRouter } from './routes';
import { UPLOAD_ROOT, UPLOAD_URL_PREFIX } from './lib/uploads';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

/** Builds the Express app. Kept separate from index.ts so tests can import it. */
export function createApp() {
  const app = express();

  // Behind Vercel's rewrite proxy / Railway's load balancer: trust the first hop
  // so rate limiting sees the real client IP.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Uploaded product images / logos. Served before the API router, no auth needed.
  app.use(UPLOAD_URL_PREFIX, express.static(UPLOAD_ROOT, { maxAge: '7d', index: false }));

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

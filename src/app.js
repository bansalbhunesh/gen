/**
 * Express application factory.
 *
 * Assembles security middleware, rate limiting, static hosting for the
 * accessible web client, the JSON API, and centralised error handling.
 * Exported as a factory so tests can spin up an isolated instance.
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import config from './config.js';
import apiRouter from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

export function createApp() {
  const app = express();

  // Trust the first proxy hop so rate-limiting sees real client IPs behind a
  // load balancer, without trusting the whole chain.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // --- Security headers ---------------------------------------------------
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  // --- CORS ---------------------------------------------------------------
  const allowAll = config.cors.origins.includes('*');
  app.use(
    cors({
      origin: allowAll ? true : config.cors.origins,
      methods: ['GET', 'POST'],
    }),
  );

  // --- Body parsing (bounded to mitigate payload-based abuse) -------------
  app.use(express.json({ limit: '16kb' }));

  // --- Rate limiting on the API surface -----------------------------------
  app.use(
    '/api',
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please slow down.' },
    }),
  );

  // --- API ----------------------------------------------------------------
  app.use('/api', apiRouter);

  // --- Static accessible web client ---------------------------------------
  app.use(express.static(publicDir, { extensions: ['html'], maxAge: '1h' }));

  // --- Fallbacks ----------------------------------------------------------
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;

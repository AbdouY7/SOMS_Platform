// src/app.js
// Middleware order exactly as spec: helmet -> cors -> hpp -> compression ->
// express.json -> cookieParser -> pino-http -> general rate limiter -> routers -> notFound -> errorHandler

import express from 'express';
import cors from 'cors';
import hpp from 'hpp';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';

import { helmetOptions } from './config/helmet.js';
import { corsOptions } from './config/cors.js';
import { general } from './middleware/rateLimiters.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Routes
import healthRouter from './modules/health/health.routes.js';

const app = express();

// ── Security headers
app.use(helmetOptions);

// ── CORS with credentials
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── HTTP Parameter Pollution guard
app.use(hpp());

// ── gzip compression
app.use(compression());

// ── Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Cookie parser (for refresh token httpOnly cookie)
app.use(cookieParser());

// ── Structured request logging (pino-http)
app.use(
  pinoHttp({
    logger,
    // Never log Authorization or Cookie headers
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  })
);

// ── General rate limiter (applied before all routes)
app.use(general);

// ── Routers under /api
app.use('/api', healthRouter);

// ── 404 for unmatched routes
app.use(notFound);

// ── Central error handler (must be last, 4-arg signature)
app.use(errorHandler);

export default app;

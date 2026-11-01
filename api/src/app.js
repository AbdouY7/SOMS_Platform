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
import authRouter from './modules/auth/auth.routes.js';
import { publicRequestsRouter, adminRequestsRouter } from './modules/requests/requests.routes.js';
import { adminRouter as companiesAdminRouter, companyRouter } from './modules/company/company.routes.js';
import { adminUsersRouter, companyUsersRouter } from './modules/users/users.routes.js';
import { adminLogsRouter, companyLogsRouter } from './modules/logs/logs.routes.js';
import { adminSettingsRouter, publicSettingsRouter } from './modules/settings/settings.routes.js';
import dashboardRouter from './modules/admin/dashboard.routes.js';
// System 4
import { importsRouter } from './modules/imports/imports.routes.js';
import { postsRouter }   from './modules/posts/posts.routes.js';
import { wilayasRouter } from './modules/wilayas/wilayas.routes.js';
import { demoRouter }    from './modules/demo/demo.routes.js';

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
app.use('/api/auth', authRouter);
app.use('/api/public/company-requests', publicRequestsRouter);
app.use('/api/admin/requests',           adminRequestsRouter);
app.use('/api/admin/companies',          companiesAdminRouter);
app.use('/api/admin/users',              adminUsersRouter);
app.use('/api/admin/activity-logs',      adminLogsRouter);
app.use('/api/admin/settings',           adminSettingsRouter);
app.use('/api/admin/dashboard',          dashboardRouter);
app.use('/api/settings',                 publicSettingsRouter);
app.use('/api/company',               companyRouter);
app.use('/api/company/users',         companyUsersRouter);
app.use('/api/company/activity-logs', companyLogsRouter);
// System 4
app.use('/api/imports',               importsRouter);
app.use('/api/posts',                 postsRouter);
app.use('/api/wilayas',               wilayasRouter);
app.use('/api/admin/demo-data',       demoRouter);

// ── 404 for unmatched routes
app.use(notFound);

// ── Central error handler (must be last, 4-arg signature)
app.use(errorHandler);

export default app;

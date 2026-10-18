// src/modules/health/health.routes.js
import { Router } from 'express';
import pg from 'pg';
import { analyticsClient } from '../../services/analyticsClient.js';
import { ok } from '../../utils/apiResponse.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

const router = Router();

router.get('/health', async (req, res) => {
  const result = {
    api: 'ok',
    database: 'unknown',
    analytics: 'unknown',
    timestamp: new Date().toISOString(),
  };

  // ── Database check via native pg (works before any Prisma models exist)
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  try {
    await client.connect();
    await client.query('SELECT 1');
    result.database = 'ok';
  } catch (err) {
    logger.error({ err }, 'Health check: database down');
    result.database = 'down';
  } finally {
    await client.end().catch(() => {});
  }

  // ── Flask check (optional, non-blocking)
  try {
    const { data } = await analyticsClient.get('/health');
    result.analytics = data?.status === 'ok' ? 'ok' : 'degraded';
  } catch {
    result.analytics = 'down';
  }

  const allOk = result.database === 'ok';
  return ok(res, result, undefined, allOk ? 200 : 503);
});

export default router;

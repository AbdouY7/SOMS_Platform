// src/modules/health/health.routes.js
import { Router } from 'express';
import { prisma } from '../../prisma.js';
import { analyticsClient } from '../../services/analyticsClient.js';
import { ok } from '../../utils/apiResponse.js';
import { logger } from '../../utils/logger.js';

const router = Router();

router.get('/health', async (req, res) => {
  const result = {
    api: 'ok',
    database: 'unknown',
    analytics: 'unknown',
    timestamp: new Date().toISOString(),
  };

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    result.database = 'ok';
  } catch (err) {
    logger.error({ err }, 'Health check: database down');
    result.database = 'down';
  }

  // Flask check (optional, non-blocking)
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

// src/modules/growth/growth.routes.js — mounted at /api/analytics/growth
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { growthSummaryQuerySchema, growthOpportunitiesQuerySchema } from './growth.schema.js';
import * as c from './growth.controller.js';

const COMPANY_ROLES = ['company_admin', 'analyst', 'viewer'];

const router = Router();
router.use(requireAuth, requireRole(...COMPANY_ROLES));

router.get('/summary', validate(z.object({ query: growthSummaryQuerySchema })), c.getGrowthSummary);
router.get('/opportunities', validate(z.object({ query: growthOpportunitiesQuerySchema })), c.getGrowthOpportunities);

export const growthRouter = router;


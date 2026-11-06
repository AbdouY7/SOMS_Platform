// src/modules/scheduler/scheduler.routes.js
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  schedulerAnalysisQuerySchema,
  createScheduledItemSchema,
  updateScheduledItemSchema,
  listScheduledItemsQuerySchema,
} from './scheduler.schema.js';
import * as c from './scheduler.controller.js';

const ALL_COMPANY = ['company_admin', 'analyst', 'viewer'];
const WRITERS = ['company_admin', 'analyst'];

// Router 1: Analytics Router (mounted at /api/analytics/scheduler)
const analyticsRouter = Router();
analyticsRouter.use(requireAuth, requireRole(...ALL_COMPANY));
analyticsRouter.get(
  '/',
  validate(z.object({ query: schedulerAnalysisQuerySchema })),
  c.getSchedulerAnalysis
);

// Router 2: Schedule Items Router (mounted at /api/schedule/items)
const itemsRouter = Router();
itemsRouter.use(requireAuth, requireRole(...ALL_COMPANY));

itemsRouter.get(
  '/',
  validate(z.object({ query: listScheduledItemsQuerySchema })),
  c.listScheduledItems
);

itemsRouter.post(
  '/',
  requireRole(...WRITERS),
  validate(z.object({ body: createScheduledItemSchema })),
  c.createScheduledItem
);

itemsRouter.patch(
  '/:id',
  requireRole(...WRITERS),
  validate(z.object({ body: updateScheduledItemSchema })),
  c.updateScheduledItem
);

itemsRouter.delete(
  '/:id',
  requireRole(...WRITERS),
  c.deleteScheduledItem
);

export { analyticsRouter as schedulerAnalyticsRouter, itemsRouter as scheduleItemsRouter };


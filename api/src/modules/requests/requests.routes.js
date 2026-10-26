// src/modules/requests/requests.routes.js
import { Router } from 'express';
import { submit, listRequests, getRequest, decideRequest } from './requests.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validate } from '../../middleware/validate.js';
import { register as registerLimiter } from '../../middleware/rateLimiters.js';
import { submitRequestSchema, decideRequestSchema, listRequestsSchema } from './requests.schema.js';

// Public router — mounted at /api/public/company-requests
export const publicRequestsRouter = Router();
publicRequestsRouter.post('/', registerLimiter, validate(submitRequestSchema), submit);

// Admin router — mounted at /api/admin/requests
export const adminRequestsRouter = Router();
adminRequestsRouter.get('/', requireAuth, requireRole('super_admin'), validate(listRequestsSchema), listRequests);
adminRequestsRouter.get('/:id', requireAuth, requireRole('super_admin'), getRequest);
adminRequestsRouter.patch('/:id', requireAuth, requireRole('super_admin'), validate(decideRequestSchema), decideRequest);

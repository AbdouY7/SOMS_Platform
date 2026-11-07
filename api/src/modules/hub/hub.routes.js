// src/modules/hub/hub.routes.js
import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { resolveCompanyScope } from '../../middleware/resolveCompanyScope.js';
import { getHubSummary } from './hub.controller.js';

export const hubRouter = Router();

const ALL_COMPANY = ['company_admin', 'analyst', 'viewer'];

hubRouter.use(requireAuth, requireRole(...ALL_COMPANY), resolveCompanyScope);

hubRouter.get('/summary', getHubSummary);

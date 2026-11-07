// src/modules/reports/reports.routes.js
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { resolveCompanyScope } from '../../middleware/resolveCompanyScope.js';
import { validate } from '../../middleware/validate.js';
import { createReportSchema, listReportsQuerySchema } from './reports.validation.js';
import {
  createReport,
  listReports,
  getReport,
  exportCsv,
  deleteReport,
} from './reports.controller.js';

export const reportsRouter = Router();

const ALL_COMPANY = ['company_admin', 'analyst', 'viewer'];
const WRITERS = ['company_admin', 'analyst'];

reportsRouter.use(requireAuth, requireRole(...ALL_COMPANY), resolveCompanyScope);

const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid report ID' }),
});

// Create report snapshot
reportsRouter.post(
  '/',
  requireRole(...WRITERS),
  validate(z.object({ body: createReportSchema })),
  createReport
);

// List company reports
reportsRouter.get(
  '/',
  validate(z.object({ query: listReportsQuerySchema })),
  listReports
);

// Export report as CSV (UTF-8 BOM)
reportsRouter.get(
  '/:id/export.csv',
  validate(z.object({ params: idParamSchema })),
  exportCsv
);

// Get single report snapshot
reportsRouter.get(
  '/:id',
  validate(z.object({ params: idParamSchema })),
  getReport
);

// Delete report (company_admin only)
reportsRouter.delete(
  '/:id',
  requireRole('company_admin'),
  validate(z.object({ params: idParamSchema })),
  deleteReport
);

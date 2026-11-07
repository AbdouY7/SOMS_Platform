// src/modules/reports/reports.validation.js
import { z } from 'zod';

export const createReportSchema = z.object({
  type: z.enum(['geo', 'growth', 'scheduler', 'forecast', 'combined']),
  title: z.string().trim().min(1).max(150),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'start must be YYYY-MM-DD').optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'end must be YYYY-MM-DD').optional(),
  filters: z.record(z.any()).optional().default({}),
  dataMode: z.enum(['real', 'demo']).optional().default('real'),
});

export const listReportsQuerySchema = z.object({
  type: z.enum(['geo', 'growth', 'scheduler', 'forecast', 'combined']).optional(),
  dataMode: z.enum(['real', 'demo']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

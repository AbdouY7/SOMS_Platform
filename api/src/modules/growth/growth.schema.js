// src/modules/growth/growth.schema.js
import { z } from 'zod';

const weight = z.number().min(0).max(100);

export const growthSummaryQuerySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  granularity: z.enum(['day', 'week', 'month']).default('month'),
  metric: z.enum(['orders', 'revenue', 'followers']).default('orders'),
  dataMode: z.enum(['real', 'demo']).default('real'),
});

export const growthOpportunitiesQuerySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  dataMode: z.enum(['real', 'demo']).default('real'),
  // Optional custom weights override
  weights: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    }, z.object({
      demandGrowth: weight,
      conversionRate: weight,
      leadsVolume: weight,
      cac: weight,
      margin: weight,
    }).optional())
    .refine(
      (w) => !w || Math.round(Object.values(w).reduce((a, b) => a + b, 0) * 100) / 100 === 100,
      { message: 'Weights must sum to exactly 100' }
    ),
});


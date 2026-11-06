// src/modules/forecast/forecast.validation.js
import { z } from 'zod';

export const assumptionsSchema = z.object({
  targetAudience: z.number().int().positive({ message: 'Target audience must be a positive integer' }),
  K: z.number().positive({ message: 'Capacity (K) must be positive' }),
  r: z.number().positive({ message: 'Growth rate (r) must be positive' }).max(5.0, { message: 'Growth rate (r) must be <= 5.0' }),
  t0: z.number().min(0, { message: 'Midpoint day (t0) must be non-negative' }),
  durationDays: z.number().int().min(1, { message: 'Duration must be at least 1 day' }).max(365, { message: 'Duration cannot exceed 365 days' }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Start date must be YYYY-MM-DD' }),
  budget: z.number().min(0, { message: 'Budget cannot be negative' }).optional().nullable(),
  maxReachPct: z.number().min(0).max(100).optional().nullable(),
  volatility: z.number().min(0).optional(),
}).refine((data) => data.K <= data.targetAudience, {
  message: 'Capacity (K) cannot exceed target audience',
  path: ['K'],
});

export const saveSimulationSchema = z.object({
  name: z.string().trim().min(1, { message: 'Simulation name is required' }).max(120),
  assumptions: assumptionsSchema,
});

export const updateSimulationSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  assumptions: assumptionsSchema.optional(),
});

export const compareSimulationsSchema = z.object({
  ids: z.array(z.string().uuid({ message: 'Invalid simulation ID' }))
    .min(2, { message: 'Select at least 2 scenarios to compare' })
    .max(4, { message: 'Maximum 4 scenarios can be compared simultaneously' }),
});

export const curveFitSchema = z.object({
  observed: z.array(
    z.object({
      day: z.number().min(0),
      value: z.number().min(0),
    })
  ).min(3, { message: 'At least 3 points required for curve calibration' }).max(500),
  initialK: z.number().positive().optional().nullable(),
});


// src/modules/geo/geo.schema.js
import { z } from 'zod';

export const DIRECT_METRICS = [
  'impressions',
  'clicks',
  'conversions',
  'spend',
  'orders',
  'revenue',
  'followers',
  'profit_margin',
];

export const DERIVED_METRICS = [
  'conversion_rate',
  'cost_per_conversion',
  'average_order_value',
];

export const ALL_GEO_METRICS = [...DIRECT_METRICS, ...DERIVED_METRICS];

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const wilayaCodeRegex = /^\d{2}$/;

export const geoMetricsQuerySchema = z.object({
  query: z.object({
    start: z.string().regex(dateRegex, 'start must be YYYY-MM-DD').optional(),
    end: z.string().regex(dateRegex, 'end must be YYYY-MM-DD').optional(),
    metric: z.enum(ALL_GEO_METRICS).default('revenue'),
    dataMode: z.enum(['real', 'demo']).default('real'),
    compare: z
      .union([z.boolean(), z.string()])
      .transform((v) => v === true || v === 'true')
      .default(false),
  }),
});

export const wilayaDetailSchema = z.object({
  params: z.object({
    wilayaCode: z.string().regex(wilayaCodeRegex, 'wilayaCode must be a 2-digit code between 01 and 58'),
  }),
  query: z.object({
    start: z.string().regex(dateRegex).optional(),
    end: z.string().regex(dateRegex).optional(),
    dataMode: z.enum(['real', 'demo']).default('real'),
  }),
});

export const geoCompareQuerySchema = z.object({
  query: z.object({
    codes: z.string().min(2, 'Provide at least 2 wilaya codes separated by commas'),
    start: z.string().regex(dateRegex).optional(),
    end: z.string().regex(dateRegex).optional(),
    dataMode: z.enum(['real', 'demo']).default('real'),
  }),
});


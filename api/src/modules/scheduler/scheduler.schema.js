// src/modules/scheduler/scheduler.schema.js
import { z } from 'zod';

const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'other'];
const CONTENT_TYPES = ['image', 'video', 'reel', 'carousel', 'story', 'text', 'other'];
const STATUSES = ['planned', 'done', 'cancelled'];

export const schedulerAnalysisQuerySchema = z.object({
  platform: z.enum(PLATFORMS, {
    required_error: 'platform is required (instagram, facebook, tiktok, or other)',
  }),
  start: z.string().optional(),
  end: z.string().optional(),
  contentType: z.enum(CONTENT_TYPES).optional(),
  dataMode: z.enum(['real', 'demo']).default('real'),
  metric: z.enum(['engagement_rate', 'public_interactions', 'auto']).default('auto'),
});

export const createScheduledItemSchema = z.object({
  platform: z.enum(PLATFORMS),
  plannedAt: z.string(),
  title: z.string().min(1).max(150),
  contentType: z.enum(CONTENT_TYPES).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(STATUSES).default('planned'),
});

export const updateScheduledItemSchema = z.object({
  platform: z.enum(PLATFORMS).optional(),
  plannedAt: z.string().optional(),
  title: z.string().min(1).max(150).optional(),
  contentType: z.enum(CONTENT_TYPES).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(STATUSES).optional(),
});

export const listScheduledItemsQuerySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  platform: z.enum(PLATFORMS).optional(),
  status: z.enum(STATUSES).optional(),
});


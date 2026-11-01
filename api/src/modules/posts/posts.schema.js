// src/modules/posts/posts.schema.js
import { z } from 'zod';
import { PLATFORMS, CONTENT_TYPES } from '../../services/csvValidate.js';

const uuid = z.string().uuid();
const metric = z.coerce.number().int().min(0).max(2_000_000_000);
const blankToNull = (v) => (typeof v === 'string' && v.trim() === '' ? null : v);

const publishedAt = z.coerce
  .date()
  .refine((d) => d.getTime() <= Date.now(), { message: 'published_at cannot be in the future' });

const postFields = {
  platform: z.enum(PLATFORMS),
  externalPostId: z.preprocess(blankToNull, z.string().trim().max(120).nullish()),
  publishedAt,
  contentType: z.preprocess(blankToNull, z.enum(CONTENT_TYPES).nullish()),
  likes: metric.default(0),
  comments: metric.default(0),
  shares: metric.default(0),
  views: metric.default(0),
  clicks: metric.default(0),
};

export const createPostSchema = z.object({ body: z.object(postFields) });

export const updatePostSchema = z.object({
  params: z.object({ id: uuid }),
  body: z
    .object(postFields)
    .partial()
    .refine((b) => Object.keys(b).length > 0, { message: 'Provide at least one field to update' }),
});

export const postIdSchema = z.object({ params: z.object({ id: uuid }) });

export const listPostsSchema = z.object({
  query: z.object({
    platform: z.enum(PLATFORMS).optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

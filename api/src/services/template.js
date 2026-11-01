// src/services/template.js
// buildTemplate(type) -> CSV string (header + one example row, today's date).
import { AppError } from '../utils/AppError.js';

const today = () => new Date().toISOString().slice(0, 10);

const TEMPLATES = {
  social_posts: () => ({
    header: ['platform', 'external_post_id', 'published_at', 'content_type', 'likes', 'comments', 'shares', 'views', 'clicks'],
    example: ['instagram', 'ig_12345', today(), 'reel', 120, 14, 8, 2400, 65],
  }),
  regional_metrics: () => ({
    header: ['wilaya', 'metric_type', 'period_start', 'period_end', 'value'],
    example: ['16', 'leads', today(), today(), 250],
  }),
  sales_records: () => ({
    header: ['order_date', 'order_count', 'revenue'],
    example: [today(), 42, 185000],
  }),
};

export function buildTemplate(type) {
  const build = TEMPLATES[type];
  if (!build) throw new AppError(`Unknown import type: ${type}`, 400, 'INVALID_TYPE');
  const { header, example } = build();
  // BOM so Excel opens it as UTF-8
  return `\uFEFF${header.join(',')}\n${example.join(',')}\n`;
}

// src/services/template.js
// buildTemplate(type) -> CSV string (header + one example row, today's date).
import { AppError } from '../utils/AppError.js';

const today = () => new Date().toISOString().slice(0, 10);

const TEMPLATES = {
  social_posts: () => ({
    header: ['platform', 'external_post_id', 'published_at', 'content_type', 'caption_public', 'likes', 'comments', 'shares', 'views', 'reach', 'impressions', 'clicks'],
    example: ['instagram', 'ig_12345', today(), 'reel', 'Sample caption', 120, 14, 8, 2400, 1800, 2200, 65],
  }),
  regional_metrics: () => ({
    header: ['wilaya', 'period_start', 'period_end', 'metric_type', 'metric_value'],
    example: ['16', today(), today(), 'impressions', 2500],
  }),
  sales_records: () => ({
    header: ['order_date', 'wilaya', 'product_category', 'order_count', 'revenue', 'acquisition_cost'],
    example: [today(), '16', 'electronics', 42, 185000, 12000],
  }),
};

export function buildTemplate(type) {
  const build = TEMPLATES[type];
  if (!build) throw new AppError(`Unknown import type: ${type}`, 400, 'INVALID_TYPE');
  const { header, example } = build();
  // BOM so Excel opens it as UTF-8
  return `\uFEFF${header.join(',')}\n${example.join(',')}\n`;
}

// src/features/data/constants.js
export const IMPORT_TYPES = [
  { value: 'social_posts', label: 'Social posts', hint: 'Posts with platform, publish date and engagement numbers.' },
  { value: 'regional_metrics', label: 'Regional metrics', hint: 'Leads, orders or revenue per wilaya and period.' },
  { value: 'sales_records', label: 'Sales records', hint: 'Daily order count and revenue.' },
];

export const PLATFORMS = ['facebook', 'instagram', 'tiktok', 'youtube', 'linkedin', 'x'];
export const CONTENT_TYPES = ['image', 'video', 'carousel', 'text', 'story', 'reel'];

export const importTypeLabel = (value) => IMPORT_TYPES.find((t) => t.value === value)?.label ?? value;

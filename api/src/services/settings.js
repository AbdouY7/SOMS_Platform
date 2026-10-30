// src/services/settings.js
// Typed, cached system settings.
//   settingsService.get(key)                    -> value (cache first, DB fallback)
//   settingsService.getAll()                    -> { key: value }
//   settingsService.getPublic()                 -> { defaultLanguage, allowRegistration }
//   settingsService.set(key, value, userId, ip) -> validate, write, invalidate cache
//   settingsService.init()                      -> seed missing rows (idempotent) + warm cache
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { AppError } from '../utils/AppError.js';
import { record } from './activity.js';

export const WEIGHT_KEYS = ['demand_growth', 'conversion_rate', 'leads_volume', 'cac', 'margin'];

export const DEFAULTS = {
  default_language: 'ar',
  allow_registration: true,
  import_max_file_mb: 5,
  import_max_rows: 50000,
  scheduler_min_posts_per_slot: 5,
  scheduler_min_total_posts: 30,
  growth_min_periods: 3,
  opportunity_weights: {
    demand_growth: 30,
    conversion_rate: 25,
    leads_volume: 20,
    cac: 15,
    margin: 10,
  },
};

const weight = z.number().min(0).max(100);

const SCHEMAS = {
  default_language: z.enum(['ar', 'fr', 'en']),
  allow_registration: z.boolean(),
  import_max_file_mb: z.number().int().min(1).max(50),
  import_max_rows: z.number().int().min(100).max(500000),
  scheduler_min_posts_per_slot: z.number().int().min(1),
  scheduler_min_total_posts: z.number().int().min(1),
  growth_min_periods: z.number().int().min(2),
  opportunity_weights: z
    .object({
      demand_growth: weight,
      conversion_rate: weight,
      leads_volume: weight,
      cac: weight,
      margin: weight,
    })
    .strict()
    .refine((w) => Math.round(Object.values(w).reduce((a, b) => a + b, 0) * 100) / 100 === 100, {
      message: 'Opportunity weights must sum to exactly 100',
    }),
};

const cache = new Map();

export const SETTING_KEYS = Object.keys(SCHEMAS);

/** Seed any missing rows (never overwrites) and warm the cache. */
export async function init() {
  await prisma.systemSetting.createMany({
    data: SETTING_KEYS.map((key) => ({ key, value: DEFAULTS[key] })),
    skipDuplicates: true,
  });
  const rows = await prisma.systemSetting.findMany();
  cache.clear();
  for (const row of rows) cache.set(row.key, row.value);
}

export async function get(key) {
  if (cache.has(key)) return cache.get(key);
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  const value = row ? row.value : DEFAULTS[key];
  if (value !== undefined) cache.set(key, value);
  return value;
}

export async function getAll() {
  const rows = await prisma.systemSetting.findMany();
  const map = { ...DEFAULTS };
  for (const row of rows) map[row.key] = row.value;
  for (const [k, v] of Object.entries(map)) cache.set(k, v);
  return map;
}

export async function getPublic() {
  const [defaultLanguage, allowRegistration] = await Promise.all([
    get('default_language'),
    get('allow_registration'),
  ]);
  return { defaultLanguage, allowRegistration };
}

export async function set(key, value, userId = null, ip = null) {
  const schema = SCHEMAS[key];
  if (!schema) throw new AppError(`Unknown setting: ${key}`, 404, 'SETTING_NOT_FOUND');

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? 'Invalid value', 400, 'VALIDATION_ERROR');
  }

  const previous = await get(key);
  const row = await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value: parsed.data, updatedBy: userId },
    update: { value: parsed.data, updatedBy: userId },
  });
  cache.delete(key); // invalidate; next read reloads from DB

  await record({
    actorUserId: userId,
    action: 'settings.updated',
    entityType: 'Setting',
    metadata: { key, from: previous, to: parsed.data },
    ip,
  });

  return { key: row.key, value: row.value, updatedAt: row.updatedAt };
}

export const settingsService = { init, get, getAll, getPublic, set };

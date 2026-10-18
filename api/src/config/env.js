// src/config/env.js
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TTL_DAYS: z.coerce.number().default(7),
  COOKIE_SECURE: z.string().transform((v) => v === 'true').default('false'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  MAX_UPLOAD_MB: z.coerce.number().default(5),
  APP_TIMEZONE: z.string().default('Africa/Algiers'),
  SUPERADMIN_EMAIL: z.string().email('SUPERADMIN_EMAIL must be a valid email'),
  SUPERADMIN_PASSWORD: z.string().min(10, 'SUPERADMIN_PASSWORD must be at least 10 characters'),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  ANALYTICS_URL: z.string().url('ANALYTICS_URL must be a valid URL').default('http://localhost:5000'),
  INTERNAL_API_KEY: z.string().min(32, 'INTERNAL_API_KEY must be at least 32 characters'),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    console.error(`\n❌ Environment validation failed:\n${errors}\n`);
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();

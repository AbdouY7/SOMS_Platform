// src/modules/auth/auth.schema.js
import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const refreshSchema = z.object({});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password required'),
    newPassword: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .refine((val) => val.length >= 10, 'Password must be at least 10 characters'),
  }).refine(
    (data) => data.currentPassword !== data.newPassword,
    { message: 'New password must be different from current password', path: ['newPassword'] }
  ),
});

export const updateMeSchema = z.object({
  body: z.object({
    fullName: z.string().min(1).max(120).optional(),
    preferredLanguage: z.enum(['ar', 'fr', 'en']).optional(),
  }),
});

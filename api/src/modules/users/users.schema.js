// src/modules/users/users.schema.js
import { z } from 'zod';

const uuid = z.string().uuid();
const page = z.coerce.number().int().positive().default(1);
const limit = z.coerce.number().int().positive().max(100).default(20);

export const listUsersSchema = z.object({
  query: z.object({
    companyId: uuid.optional(),
    role: z.enum(['super_admin', 'company_admin', 'analyst', 'viewer']).optional(),
    isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    search: z.string().max(100).optional(),
    page,
    limit,
  }),
});

export const createUserSchema = z.object({
  body: z.object({
    fullName:  z.string().min(1).max(120),
    email:     z.string().email(),
    password:  z.string().min(10, 'Password must be at least 10 characters'),
    role:      z.enum(['super_admin', 'company_admin', 'analyst', 'viewer']),
    companyId: uuid.optional(),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    fullName:  z.string().min(1).max(120).optional(),
    role:      z.enum(['super_admin', 'company_admin', 'analyst', 'viewer']).optional(),
    companyId: uuid.optional(),
  }),
});

export const setUserStatusSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

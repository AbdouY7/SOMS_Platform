// src/modules/company/company.schema.js
import { z } from 'zod';

export const createCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(150),
    registrationNumber: z.string().max(50).optional(),
    industry: z.string().max(100).optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(30).optional(),
    address: z.string().max(500).optional(),
  }),
});

export const updateCompanySchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(1).max(150).optional(),
    registrationNumber: z.string().max(50).optional(),
    industry: z.string().max(100).optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(30).optional(),
    address: z.string().max(500).optional(),
  }),
});

export const setStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['active', 'inactive']),
  }),
});

export const updateOwnCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(150).optional(),
    industry: z.string().max(100).optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(30).optional(),
    address: z.string().max(500).optional(),
  }),
});

export const listCompaniesSchema = z.object({
  query: z.object({
    search: z.string().max(100).optional(),
    status: z.enum(['active', 'inactive']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

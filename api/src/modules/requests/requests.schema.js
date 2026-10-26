// src/modules/requests/requests.schema.js
import { z } from 'zod';

export const submitRequestSchema = z.object({
  body: z.object({
    companyName: z.string().min(1).max(150),
    registrationNumber: z.string().max(50).optional(),
    industry: z.string().max(100).optional(),
    contactPhone: z.string().max(30).optional(),
    applicantFullName: z.string().min(1).max(120),
    applicantEmail: z.string().email(),
    password: z.string().min(10, 'Password must be at least 10 characters'),
    confirmPassword: z.string().min(1),
  }).refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

export const decideRequestSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    decision: z.enum(['approved', 'rejected']),
    note: z.string().max(500).optional(),
  }).refine(
    (d) => !(d.decision === 'rejected' && !d.note?.trim()),
    { message: 'A note is required when rejecting', path: ['note'] }
  ),
});

export const listRequestsSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    search: z.string().max(100).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

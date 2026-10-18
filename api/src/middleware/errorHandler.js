// src/middleware/errorHandler.js
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { fail } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Express error-handling middleware. Maps AppError, ZodError and Prisma errors
 * to the standard envelope. Hides internal details in production.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Log every error (without leaking secrets — logger handles redaction)
  logger.error({ err, reqId: req.id }, err.message);

  // AppError: known application errors
  if (err instanceof AppError) {
    return fail(res, err.status, err.code, err.message, err.details);
  }

  // Zod validation errors (rare here since validate middleware handles them, but defensive)
  if (err instanceof ZodError) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Request validation failed', err.errors);
  }

  // Prisma unique constraint violation -> CONFLICT
  if (err.code === 'P2002') {
    return fail(res, 409, 'CONFLICT', 'A record with that value already exists');
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return fail(res, 404, 'NOT_FOUND', 'Record not found');
  }

  // Unexpected errors: generic in production, detailed in dev
  const message = env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message;
  const details = env.NODE_ENV === 'production' ? undefined : err.stack;

  return fail(res, 500, 'INTERNAL_ERROR', message, details);
}

/**
 * 404 handler for unmatched routes.
 */
export function notFound(req, res) {
  return fail(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
}

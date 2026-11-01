// src/utils/http.js
// Tiny helpers used by System 4 controllers.
//   asyncHandler(fn)      - wraps async route handlers, forwards errors to next()
//   parseRequest(schema, req) - validates req against a Zod schema with {body?,query?,params?}
import { ZodError } from 'zod';
import { AppError } from './AppError.js';

/**
 * Wraps an async Express handler so unhandled promise rejections are forwarded
 * to Express's error handler via next().
 */
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * Validates req against a Zod schema of shape { body?, query?, params? }.
 * Throws AppError(400) on validation failure.
 * Returns the parsed (stripped) values.
 */
export function parseRequest(schema, req) {
  try {
    const toValidate = {};
    if (schema.shape?.body)   toValidate.body   = req.body;
    if (schema.shape?.query)  toValidate.query  = req.query;
    if (schema.shape?.params) toValidate.params = req.params;

    const parsed = schema.parse(toValidate);
    return parsed;
  } catch (err) {
    if (err instanceof ZodError) {
      throw new AppError('Request validation failed', 400, 'VALIDATION_ERROR', err.errors);
    }
    throw err;
  }
}

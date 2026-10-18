// src/middleware/validate.js
import { ZodError } from 'zod';
import { fail } from '../utils/apiResponse.js';

/**
 * Validate request using a zod schema object with optional body/query/params keys.
 * Replaces req.body, req.query, req.params with the parsed (stripped) values.
 *
 * @param {import('zod').ZodObject<{body?: any, query?: any, params?: any}>} schema
 */
export function validate(schema) {
  return async (req, res, next) => {
    try {
      const toValidate = {};
      if (schema.shape?.body) toValidate.body = req.body;
      if (schema.shape?.query) toValidate.query = req.query;
      if (schema.shape?.params) toValidate.params = req.params;

      const parsed = await schema.parseAsync(toValidate);

      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return fail(res, 400, 'VALIDATION_ERROR', 'Request validation failed', err.errors);
      }
      next(err);
    }
  };
}

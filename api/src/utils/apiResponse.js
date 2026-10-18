// src/utils/apiResponse.js

/**
 * Send a successful response with the standard envelope.
 * @param {import('express').Response} res
 * @param {any} data
 * @param {object} [meta] - pagination meta (page, limit, total)
 * @param {number} [status] - HTTP status code (default 200)
 */
export function ok(res, data = null, meta = undefined, status = 200) {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
}

/**
 * Send a failure response with the standard error envelope.
 * @param {import('express').Response} res
 * @param {number} status - HTTP status code
 * @param {string} code - Error code (e.g. 'VALIDATION_ERROR')
 * @param {string} message - Human-readable message
 * @param {any} [details] - Extra details (zod issues, etc.)
 */
export function fail(res, status, code, message, details = undefined) {
  const error = { code, message };
  if (details !== undefined) error.details = details;
  return res.status(status).json({ success: false, error });
}

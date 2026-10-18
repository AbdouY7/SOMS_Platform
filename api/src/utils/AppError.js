// src/utils/AppError.js

/**
 * Application-level error. Services throw this; errorHandler maps it to the envelope.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable message (not leaked in production unless explicitly public)
   * @param {number} status - HTTP status code
   * @param {string} code - Error code from the spec (e.g. 'NOT_FOUND')
   * @param {any} [details] - Extra data (zod issues, missing fields, etc.)
   */
  constructor(message, status = 500, code = 'INTERNAL_ERROR', details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static notFound(message = 'Not found') {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static forbidden(message = 'Access denied') {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static unauthenticated(message = 'Authentication required') {
    return new AppError(message, 401, 'UNAUTHENTICATED');
  }

  static conflict(message = 'Conflict') {
    return new AppError(message, 409, 'CONFLICT');
  }

  static validation(message = 'Validation error', details) {
    return new AppError(message, 400, 'VALIDATION_ERROR', details);
  }

  static insufficientData(message = 'Insufficient data', details) {
    return new AppError(message, 422, 'INSUFFICIENT_DATA', details);
  }
}

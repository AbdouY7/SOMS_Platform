// src/middleware/requireRole.js
import { AppError } from '../utils/AppError.js';

/**
 * requireRole(...roles): 403 if req.user.role is not in the allowed list.
 * Must be used AFTER requireAuth.
 *
 * @param {...string} roles - Allowed roles
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthenticated('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

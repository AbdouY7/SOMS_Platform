// src/middleware/rateLimiters.js
import rateLimit from 'express-rate-limit';
import { fail } from '../utils/apiResponse.js';

const handler = (req, res) =>
  fail(res, 429, 'RATE_LIMITED', 'Too many requests, please try again later');

/**
 * General rate limiter: 300 requests per 15 minutes per IP
 */
export const general = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

/**
 * Login: 5 per 15 minutes per IP
 */
export const login = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

/**
 * Register request: 5 per hour per IP
 */
export const register = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

/**
 * Refresh token: 30 per 15 minutes per IP
 */
export const refresh = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

/**
 * File upload: 20 per hour per IP
 */
export const upload = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

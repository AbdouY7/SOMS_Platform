// src/middleware/rateLimiters.js
import rateLimit from 'express-rate-limit';
import { fail } from '../utils/apiResponse.js';

const handler = (req, res) =>
  fail(res, 429, 'RATE_LIMITED', 'Too many requests, please try again later');

// Bypass rate limiting entirely in test environment
const isTest = process.env.NODE_ENV === 'test';
const passThrough = (_req, _res, next) => next();

/**
 * General rate limiter: 300 requests per 15 minutes per IP
 */
export const general  = isTest ? passThrough : rateLimit({ windowMs: 15 * 60 * 1000, max: 300,  standardHeaders: true, legacyHeaders: false, handler });
export const login    = isTest ? passThrough : rateLimit({ windowMs: 15 * 60 * 1000, max: 5,    standardHeaders: true, legacyHeaders: false, handler });
export const register = isTest ? passThrough : rateLimit({ windowMs: 60 * 60 * 1000, max: 5,    standardHeaders: true, legacyHeaders: false, handler });
export const refresh  = isTest ? passThrough : rateLimit({ windowMs: 15 * 60 * 1000, max: 30,   standardHeaders: true, legacyHeaders: false, handler });
export const upload   = isTest ? passThrough : rateLimit({ windowMs: 60 * 60 * 1000, max: 20,   standardHeaders: true, legacyHeaders: false, handler });

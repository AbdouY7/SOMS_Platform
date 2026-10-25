// src/modules/auth/auth.routes.js
import { Router } from 'express';
import { login, refresh, logout, getMe, updateMe, changePassword } from './auth.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { login as loginLimiter, refresh as refreshLimiter } from '../../middleware/rateLimiters.js';
import {
  loginSchema,
  changePasswordSchema,
  updateMeSchema,
} from './auth.schema.js';

const router = Router();

// Public
router.post('/login',   loginLimiter,   validate(loginSchema),   login);
router.post('/refresh', refreshLimiter, refresh);

// Authenticated
router.post('/logout',          requireAuth, logout);
router.get('/me',               requireAuth, getMe);
router.patch('/me',             requireAuth, validate(updateMeSchema), updateMe);
router.post('/change-password', requireAuth, validate(changePasswordSchema), changePassword);

export default router;

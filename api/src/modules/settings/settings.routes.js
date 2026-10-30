// src/modules/settings/settings.routes.js
import { Router } from 'express';
import { getAllSettings, updateSetting, getPublicSettings } from './settings.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';

// Admin router — mounted at /api/admin/settings
export const adminSettingsRouter = Router();
adminSettingsRouter.get('/',     requireAuth, requireRole('super_admin'), getAllSettings);
adminSettingsRouter.patch('/:key', requireAuth, requireRole('super_admin'), updateSetting);

// Public router — mounted at /api/settings
export const publicSettingsRouter = Router();
publicSettingsRouter.get('/public', getPublicSettings);

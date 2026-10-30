// src/modules/admin/dashboard.routes.js
import { Router } from 'express';
import { getAdminDashboard } from './dashboard.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';

const router = Router();
router.get('/', requireAuth, requireRole('super_admin'), getAdminDashboard);

export default router;

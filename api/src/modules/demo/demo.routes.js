// src/modules/demo/demo.routes.js  — mounted at /api/admin/demo-data
import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { seed, purge } from './demo.controller.js';

const router = Router();
router.use(requireAuth, requireRole('super_admin'));
router.post('/:companyId/seed', seed);
router.post('/:companyId/purge', purge);

export const demoRouter = router;

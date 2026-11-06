// src/modules/geo/geo.routes.js — mounted at /api/analytics/geo
import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import * as c from './geo.controller.js';

const COMPANY_ROLES = ['company_admin', 'analyst', 'viewer'];

const router = Router();
router.use(requireAuth, requireRole(...COMPANY_ROLES));

router.get('/', c.getGeo);
router.get('/compare', c.compare);
router.get('/:wilayaCode', c.getDetail);

export const geoRouter = router;


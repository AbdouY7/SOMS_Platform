// src/modules/imports/imports.routes.js  — mounted at /api/imports
import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { uploadCsv } from '../../middleware/uploadMemory.js';
import * as c from './imports.controller.js';

const READ = ['company_admin', 'analyst', 'viewer'];
const WRITE = ['company_admin', 'analyst'];

const router = Router();
router.use(requireAuth);

router.get('/template/:type', requireRole(...READ), c.template); // before '/:id'
router.get('/', requireRole(...READ), c.list);
router.post('/preview', requireRole(...WRITE), uploadCsv, c.preview);
router.get('/:id', requireRole(...READ), c.detail);
router.get('/:id/errors.csv', requireRole(...READ), c.errorsCsv);
router.post('/:id/commit', requireRole(...WRITE), c.commit);
router.post('/:id/rollback', requireRole('company_admin'), c.rollback);

export const importsRouter = router;

// src/modules/posts/posts.routes.js  — mounted at /api/posts
import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import * as c from './posts.controller.js';

const READ = ['company_admin', 'analyst', 'viewer'];
const WRITE = ['company_admin', 'analyst'];

const router = Router();
router.use(requireAuth);
router.get('/', requireRole(...READ), c.list);
router.post('/', requireRole(...WRITE), c.create);
router.patch('/:id', requireRole(...WRITE), c.update);
router.delete('/:id', requireRole(...WRITE), c.remove);

export const postsRouter = router;

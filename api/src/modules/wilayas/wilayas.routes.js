// src/modules/wilayas/wilayas.routes.js  — mounted at /api/wilayas
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { list } from './wilayas.controller.js';

const router = Router();
router.get('/', requireAuth, list);

export const wilayasRouter = router;

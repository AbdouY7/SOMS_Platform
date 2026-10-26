// src/modules/company/company.routes.js
import { Router } from 'express';
import {
  listCompanies, getCompany, createCompany, updateCompany, setCompanyStatus,
  getOwnCompany, updateOwnCompany, uploadLogo,
} from './company.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { resolveCompanyScope } from '../../middleware/resolveCompanyScope.js';
import { validate } from '../../middleware/validate.js';
import { upload as uploadLimiter } from '../../middleware/rateLimiters.js';
import { uploadImage, verifyMagicBytes } from '../../middleware/upload.js';
import {
  listCompaniesSchema, createCompanySchema, updateCompanySchema,
  setStatusSchema, updateOwnCompanySchema,
} from './company.schema.js';

const adminRouter = Router();   // mounted at /api/admin/companies
const companyRouter = Router(); // mounted at /api/company

// ── Admin: companies CRUD ─────────────────────────────────────────────────────
adminRouter.get('/',    requireAuth, requireRole('super_admin'), validate(listCompaniesSchema), listCompanies);
adminRouter.post('/',   requireAuth, requireRole('super_admin'), validate(createCompanySchema), createCompany);
adminRouter.get('/:id', requireAuth, requireRole('super_admin'), getCompany);
adminRouter.patch('/:id',        requireAuth, requireRole('super_admin'), validate(updateCompanySchema), updateCompany);
adminRouter.patch('/:id/status', requireAuth, requireRole('super_admin'), validate(setStatusSchema), setCompanyStatus);

// ── Company: own profile ──────────────────────────────────────────────────────
companyRouter.get('/',    requireAuth, requireRole('company_admin', 'analyst', 'viewer'), resolveCompanyScope, getOwnCompany);
companyRouter.patch('/',  requireAuth, requireRole('company_admin'), resolveCompanyScope, validate(updateOwnCompanySchema), updateOwnCompany);
companyRouter.post('/logo', requireAuth, requireRole('company_admin'), resolveCompanyScope,
  uploadLimiter, uploadImage, verifyMagicBytes, uploadLogo);

export { adminRouter, companyRouter };

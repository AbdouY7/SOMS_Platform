// src/modules/users/users.routes.js
import { Router } from 'express';
import {
  listUsers, createUser, updateUser, setUserStatus, resetPassword,
  listCompanyUsers, createCompanyUser, updateCompanyUser, setCompanyUserStatus,
} from './users.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { resolveCompanyScope } from '../../middleware/resolveCompanyScope.js';
import { validate } from '../../middleware/validate.js';
import { listUsersSchema, createUserSchema, updateUserSchema, setUserStatusSchema } from './users.schema.js';

// ── Admin router — mounted at /api/admin/users ───────────────────────────────
export const adminUsersRouter = Router();

adminUsersRouter.get('/',
  requireAuth, requireRole('super_admin'), validate(listUsersSchema), listUsers);

adminUsersRouter.post('/',
  requireAuth, requireRole('super_admin'), validate(createUserSchema), createUser);

adminUsersRouter.patch('/:id',
  requireAuth, requireRole('super_admin'), validate(updateUserSchema), updateUser);

adminUsersRouter.patch('/:id/status',
  requireAuth, requireRole('super_admin'), validate(setUserStatusSchema), setUserStatus);

adminUsersRouter.post('/:id/reset-password',
  requireAuth, requireRole('super_admin'), resetPassword);

// ── Company router — mounted at /api/company/users ───────────────────────────
export const companyUsersRouter = Router();

companyUsersRouter.get('/',
  requireAuth, requireRole('company_admin'), resolveCompanyScope, validate(listUsersSchema), listCompanyUsers);

companyUsersRouter.post('/',
  requireAuth, requireRole('company_admin'), resolveCompanyScope, validate(createUserSchema), createCompanyUser);

companyUsersRouter.patch('/:id',
  requireAuth, requireRole('company_admin'), resolveCompanyScope, validate(updateUserSchema), updateCompanyUser);

companyUsersRouter.patch('/:id/status',
  requireAuth, requireRole('company_admin'), resolveCompanyScope, validate(setUserStatusSchema), setCompanyUserStatus);

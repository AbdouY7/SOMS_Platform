// src/modules/company/company.controller.js
import { ok } from '../../utils/apiResponse.js';
import * as companyService from './company.service.js';

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function listCompanies(req, res, next) {
  try {
    const { items, meta } = await companyService.list(req.query);
    return ok(res, items, meta);
  } catch (err) { next(err); }
}

export async function getCompany(req, res, next) {
  try {
    const company = await companyService.getById(req.params.id);
    return ok(res, company);
  } catch (err) { next(err); }
}

export async function createCompany(req, res, next) {
  try {
    const company = await companyService.create(req.body);
    return ok(res, company, undefined, 201);
  } catch (err) { next(err); }
}

export async function updateCompany(req, res, next) {
  try {
    const company = await companyService.update(req.params.id, req.body);
    return ok(res, company);
  } catch (err) { next(err); }
}

export async function setCompanyStatus(req, res, next) {
  try {
    const company = await companyService.setStatus(req.params.id, req.body.status);
    return ok(res, company);
  } catch (err) { next(err); }
}

// ── Company admin: own company ────────────────────────────────────────────────

export async function getOwnCompany(req, res, next) {
  try {
    const company = await companyService.getOwn(req.companyId);
    return ok(res, company);
  } catch (err) { next(err); }
}

export async function updateOwnCompany(req, res, next) {
  try {
    const company = await companyService.updateOwn(req.companyId, req.body);
    return ok(res, company);
  } catch (err) { next(err); }
}

export async function uploadLogo(req, res, next) {
  try {
    if (!req.file) {
      const { AppError } = await import('../../utils/AppError.js');
      return next(new AppError('Image file is required', 400, 'VALIDATION_ERROR'));
    }
    const company = await companyService.uploadLogo(req.companyId, req.file.buffer);
    return ok(res, company);
  } catch (err) { next(err); }
}

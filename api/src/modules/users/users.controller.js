// src/modules/users/users.controller.js
import { ok } from '../../utils/apiResponse.js';
import * as svc from './users.service.js';

const ip = (req) => req.ip ?? req.socket?.remoteAddress ?? null;

// ── Admin: all users ──────────────────────────────────────────────────────────

export async function listUsers(req, res, next) {
  try {
    const result = await svc.list(req.query, req.user);
    return ok(res, result.items, result.pagination);
  } catch (err) { next(err); }
}

export async function createUser(req, res, next) {
  try {
    const user = await svc.create(req.body, req.user, ip(req));
    return ok(res, user, undefined, 201);
  } catch (err) { next(err); }
}

export async function updateUser(req, res, next) {
  try {
    const user = await svc.update(req.params.id, req.body, req.user, ip(req));
    return ok(res, user);
  } catch (err) { next(err); }
}

export async function setUserStatus(req, res, next) {
  try {
    const user = await svc.setStatus(req.params.id, req.body.isActive, req.user, ip(req));
    return ok(res, user);
  } catch (err) { next(err); }
}

export async function resetPassword(req, res, next) {
  try {
    const result = await svc.resetPassword(req.params.id, req.user, ip(req));
    return ok(res, result);
  } catch (err) { next(err); }
}

// ── Company admin: own company users (same handlers, service enforces scope) ──

export const listCompanyUsers   = listUsers;
export const createCompanyUser  = createUser;
export const updateCompanyUser  = updateUser;
export const setCompanyUserStatus = setUserStatus;

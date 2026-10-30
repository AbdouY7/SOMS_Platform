// src/modules/users/users.service.js
// All user-management logic. `actor` is req.user: { id, role, companyId }.
//  - super_admin: sees/manages every user.
//  - company_admin: scoped to their own company; can never touch super_admins.
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { prisma } from '../../prisma.js';
import { AppError } from '../../utils/AppError.js';
import { record } from '../../services/activity.js';

const COMPANY_ROLES = ['company_admin', 'analyst', 'viewer'];
const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

const USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  companyId: true,
  isActive: true,
  createdAt: true,
  company: { select: { id: true, name: true } },
};

const isSuper = (actor) => actor.role === 'super_admin';

/** Find a user the actor is allowed to see. Cross-company access is a 404, never a 403. */
async function findScoped(id, actor) {
  const where = isSuper(actor)
    ? { id }
    : { id, companyId: actor.companyId, role: { in: COMPANY_ROLES } };
  const user = await prisma.user.findFirst({ where, select: USER_SELECT });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  return user;
}

async function assertNotLastAdmin(companyId, excludeUserId) {
  const others = await prisma.user.count({
    where: { companyId, role: 'company_admin', isActive: true, id: { not: excludeUserId } },
  });
  if (others === 0) {
    throw new AppError('Cannot remove the last active company admin', 400, 'LAST_COMPANY_ADMIN');
  }
}

function revokeRefreshTokens(tx, userId) {
  return tx.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

function generateTempPassword(length = 16) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += TEMP_PASSWORD_ALPHABET[crypto.randomInt(TEMP_PASSWORD_ALPHABET.length)];
  }
  return out;
}

// ─── list ─────────────────────────────────────────────────────────────────────
export async function list(filters = {}, actor) {
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 20, 100);

  const where = {};
  if (isSuper(actor)) {
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.role) where.role = filters.role;
  } else {
    where.companyId = actor.companyId;
    where.role = filters.role ?? { in: COMPANY_ROLES };
  }
  if (typeof filters.isActive === 'boolean') where.isActive = filters.isActive;
  if (filters.search) {
    where.OR = [
      { fullName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

// ─── create ───────────────────────────────────────────────────────────────────
export async function create(data, actor, ip = null) {
  const { role } = data;
  let companyId = data.companyId ?? null;

  if (!isSuper(actor)) {
    if (!COMPANY_ROLES.includes(role)) throw new AppError('You cannot assign this role', 403, 'FORBIDDEN_ROLE');
    companyId = actor.companyId; // company admins always create inside their own company
  }

  if (role === 'super_admin') {
    if (companyId) throw new AppError('A super admin cannot belong to a company', 400, 'INVALID_COMPANY');
  } else if (!companyId) {
    throw new AppError('companyId is required for company roles', 400, 'COMPANY_REQUIRED');
  }

  if (companyId) {
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!company) throw new AppError('Company not found', 404, 'COMPANY_NOT_FOUND');
  }

  const email = data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new AppError('Email is already in use', 409, 'EMAIL_TAKEN');

  const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id });

  const user = await prisma.user.create({
    data: { fullName: data.fullName, email, passwordHash, role, companyId, isActive: true },
    select: USER_SELECT,
  });

  await record({
    actorUserId: actor.id,
    companyId: user.companyId,
    action: 'user.created',
    entityType: 'User',
    entityId: user.id,
    metadata: { role: user.role, email: user.email },
    ip,
  });

  return user;
}

// ─── update ───────────────────────────────────────────────────────────────────
export async function update(id, data, actor, ip = null) {
  const target = await findScoped(id, actor);
  const changes = {};

  if (data.fullName !== undefined && data.fullName !== target.fullName) changes.fullName = data.fullName;

  const roleChanging = data.role !== undefined && data.role !== target.role;
  if (roleChanging) {
    if (target.id === actor.id) throw new AppError('You cannot change your own role', 400, 'CANNOT_CHANGE_OWN_ROLE');
    if (!isSuper(actor) && !COMPANY_ROLES.includes(data.role)) {
      throw new AppError('You cannot assign this role', 403, 'FORBIDDEN_ROLE');
    }
    changes.role = data.role;
  }

  if (data.companyId !== undefined && data.companyId !== target.companyId) {
    if (!isSuper(actor)) throw new AppError('You cannot move users between companies', 403, 'FORBIDDEN');
    changes.companyId = data.companyId;
  }

  const finalRole = changes.role ?? target.role;
  const finalCompanyId = 'companyId' in changes ? changes.companyId : target.companyId;

  if (finalRole === 'super_admin' && finalCompanyId) {
    throw new AppError('A super admin cannot belong to a company', 400, 'INVALID_COMPANY');
  }
  if (finalRole !== 'super_admin' && !finalCompanyId) {
    throw new AppError('companyId is required for company roles', 400, 'COMPANY_REQUIRED');
  }

  // Demoting or moving the last active admin would leave the company without one.
  const leavingAdminSeat =
    target.role === 'company_admin' &&
    target.isActive &&
    (finalRole !== 'company_admin' || finalCompanyId !== target.companyId);
  if (leavingAdminSeat) await assertNotLastAdmin(target.companyId, target.id);

  if (Object.keys(changes).length === 0) return target;

  const updated = await prisma.user.update({ where: { id }, data: changes, select: USER_SELECT });

  await record({
    actorUserId: actor.id,
    companyId: updated.companyId,
    action: roleChanging ? 'user.role_changed' : 'user.updated',
    entityType: 'User',
    entityId: updated.id,
    metadata: roleChanging
      ? { fields: Object.keys(changes), fromRole: target.role, toRole: updated.role }
      : { fields: Object.keys(changes) },
    ip,
  });

  return updated;
}

// ─── activate / deactivate ────────────────────────────────────────────────────
export async function setStatus(id, isActive, actor, ip = null) {
  const target = await findScoped(id, actor);

  if (!isActive && target.id === actor.id) {
    throw new AppError('You cannot deactivate your own account', 400, 'CANNOT_DEACTIVATE_SELF');
  }
  if (target.isActive === isActive) return target;
  if (!isActive && target.role === 'company_admin') {
    await assertNotLastAdmin(target.companyId, target.id);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id }, data: { isActive }, select: USER_SELECT });
    if (!isActive) await revokeRefreshTokens(tx, id);
    return user;
  });

  await record({
    actorUserId: actor.id,
    companyId: updated.companyId,
    action: 'user.status_changed',
    entityType: 'User',
    entityId: updated.id,
    metadata: { isActive },
    ip,
  });

  return updated;
}

// ─── reset password (super_admin only, enforced by the route) ─────────────────
export async function resetPassword(id, actor, ip = null) {
  const target = await findScoped(id, actor);

  const tempPassword = generateTempPassword(16);
  const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { passwordHash } });
    await revokeRefreshTokens(tx, id);
  });

  await record({
    actorUserId: actor.id,
    companyId: target.companyId,
    action: 'user.password_reset',
    entityType: 'User',
    entityId: target.id,
    ip,
  });

  // Shown once to the admin — never stored or logged in plain text.
  return { tempPassword };
}

export const userService = { list, create, update, setStatus, resetPassword };

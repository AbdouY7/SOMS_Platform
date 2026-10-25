// src/modules/auth/auth.service.js
import crypto from 'crypto';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma.js';
import { AppError } from '../../utils/AppError.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

// ── Password helpers ──────────────────────────────────────────────────────────

/**
 * Hash a password with argon2id. The ONLY function that touches hashing.
 */
export async function hashPassword(password) {
  return argon2.hash(password, { type: argon2.argon2id });
}

/**
 * Verify a password against its hash.
 */
export async function verifyPassword(hash, password) {
  return argon2.verify(hash, password);
}

// ── Token helpers ─────────────────────────────────────────────────────────────

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateRawToken() {
  return crypto.randomBytes(32).toString('hex'); // 256-bit random
}

/**
 * Issue access token + refresh token.
 * Access token: JWT HS256, 15 min, in-memory on client.
 * Refresh token: random 256-bit stored hashed in DB, sent as httpOnly cookie.
 */
export async function issueTokens(user, ctx = {}) {
  const accessToken = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      companyId: user.companyId ?? null,
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_TTL, algorithm: 'HS256' }
  );

  const rawRefresh = generateRawToken();
  const tokenHash = hashToken(rawRefresh);
  const familyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      familyId,
      expiresAt,
      userAgent: ctx.userAgent,
      ip: ctx.ip,
    },
  });

  return { accessToken, rawRefresh, expiresAt };
}

// ── Auth service functions ─────────────────────────────────────────────────────

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

/**
 * Login: validates credentials, enforces lockout, returns tokens.
 */
export async function login(email, password, ctx = {}) {
  // Look up by lower(email)
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: { company: { select: { status: true } } },
  });

  // Generic error — do NOT reveal whether email exists
  const genericError = new AppError('Invalid credentials', 401, 'UNAUTHENTICATED');

  if (!user) {
    throw genericError;
  }

  // Account lockout check
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError('Account temporarily locked. Try again later.', 401, 'UNAUTHENTICATED');
  }

  // Verify password
  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    const newCount = user.failedLoginCount + 1;
    const shouldLock = newCount >= MAX_FAILED;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: newCount,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
          : undefined,
      },
    });
    throw genericError;
  }

  // Account and company status checks
  if (!user.isActive) {
    throw new AppError('Invalid credentials', 401, 'UNAUTHENTICATED');
  }
  if (user.company && user.company.status === 'inactive') {
    throw new AppError('Invalid credentials', 401, 'UNAUTHENTICATED');
  }

  // Reset failed counter + update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const { accessToken, rawRefresh, expiresAt } = await issueTokens(user, ctx);

  return {
    accessToken,
    rawRefresh,
    expiresAt,
    user: safeUser(user),
  };
}

/**
 * Rotate refresh token. Reuse of revoked token = revoke whole family (reuse detection).
 */
export async function rotateRefreshToken(rawToken, ctx = {}) {
  const tokenHash = hashToken(rawToken);

  const existing = await prisma.refreshToken.findFirst({
    where: { tokenHash },
    include: { user: { include: { company: { select: { status: true } } } } },
  });

  if (!existing) throw new AppError('Invalid refresh token', 401, 'UNAUTHENTICATED');

  // Reuse detection: token already revoked → revoke whole family
  if (existing.revokedAt) {
    await revokeFamily(existing.familyId);
    throw new AppError('Refresh token reuse detected. Please log in again.', 401, 'UNAUTHENTICATED');
  }

  if (existing.expiresAt < new Date()) {
    throw new AppError('Refresh token expired', 401, 'UNAUTHENTICATED');
  }

  const user = existing.user;
  if (!user.isActive || (user.company && user.company.status === 'inactive')) {
    await revokeFamily(existing.familyId);
    throw new AppError('Account inactive', 401, 'UNAUTHENTICATED');
  }

  // Issue new token in the same family
  const rawRefresh = generateRawToken();
  const newHash = hashToken(rawRefresh);
  const expiresAt = new Date(Date.now() + env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

  const [newToken] = await prisma.$transaction([
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newHash,
        familyId: existing.familyId,
        expiresAt,
        userAgent: ctx.userAgent,
        ip: ctx.ip,
      },
    }),
    prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    }),
  ]);

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { replacedBy: newToken.id },
  });

  const accessToken = jwt.sign(
    { sub: user.id, role: user.role, companyId: user.companyId ?? null },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_TTL, algorithm: 'HS256' }
  );

  return { accessToken, rawRefresh, expiresAt, user: safeUser(user) };
}

/**
 * Revoke all tokens in a family (reuse detection response).
 */
export async function revokeFamily(familyId) {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Logout: revoke the specific refresh token.
 */
export async function logout(rawToken) {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Get current user (for /me).
 */
export async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: { select: { id: true, name: true, status: true, logoUrl: true } } },
  });
  if (!user) throw AppError.notFound('User not found');
  return safeUser(user);
}

/**
 * Update own profile (name, language).
 */
export async function updateMe(userId, data) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.fullName && { fullName: data.fullName }),
      ...(data.preferredLanguage && { preferredLanguage: data.preferredLanguage }),
    },
    include: { company: { select: { id: true, name: true, status: true, logoUrl: true } } },
  });
  return safeUser(updated);
}

/**
 * Change password: verify current, validate policy, hash new, revoke other sessions.
 */
export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('User not found');

  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) throw new AppError('Current password is incorrect', 400, 'VALIDATION_ERROR');

  if (newPassword.toLowerCase() === user.email.toLowerCase()) {
    throw new AppError('Password cannot be the same as your email', 400, 'VALIDATION_ERROR');
  }

  const newHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } }),
    // Revoke all other refresh tokens
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

/**
 * Seed the super admin on startup (idempotent).
 */
export async function ensureSuperAdmin() {
  const email = env.SUPERADMIN_EMAIL.toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });
  if (existing) return;

  const passwordHash = await hashPassword(env.SUPERADMIN_PASSWORD);
  await prisma.user.create({
    data: {
      fullName: 'Super Admin',
      email,
      passwordHash,
      role: 'super_admin',
      companyId: null,
    },
  });
  logger.info({ email }, 'Super admin created');
}

// ── Safe user (never returns passwordHash) ────────────────────────────────────
function safeUser(user) {
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}

// src/modules/auth/auth.controller.js
import { ok } from '../../utils/apiResponse.js';
import { env } from '../../config/env.js';
import { getPermissions } from '../../services/permissions.js';
import * as authService from './auth.service.js';

const COOKIE_NAME = 'refreshToken';
const isTest = process.env.NODE_ENV === 'test';

function setRefreshCookie(res, rawToken, expiresAt) {
  res.cookie(COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: isTest ? false : env.COOKIE_SECURE,
    sameSite: isTest ? 'lax' : 'strict',
    path: '/',
    expires: expiresAt,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isTest ? false : env.COOKIE_SECURE,
    sameSite: isTest ? 'lax' : 'strict',
    path: '/',
  });
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const ctx = { ip: req.ip, userAgent: req.headers['user-agent'] };

    const { accessToken, rawRefresh, expiresAt, user } =
      await authService.login(email, password, ctx);

    setRefreshCookie(res, rawRefresh, expiresAt);
    return ok(res, { accessToken, user: { ...user, permissions: getPermissions(user.role) } });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (!rawToken) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'No refresh token' },
      });
    }

    const ctx = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const { accessToken, rawRefresh, expiresAt, user } =
      await authService.rotateRefreshToken(rawToken, ctx);

    setRefreshCookie(res, rawRefresh, expiresAt);
    return ok(res, { accessToken, user: { ...user, permissions: getPermissions(user.role) } });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken;
    if (rawToken) await authService.logout(rawToken);
    clearRefreshCookie(res);
    return ok(res, { message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);
    return ok(res, { ...user, permissions: getPermissions(user.role) });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const user = await authService.updateMe(req.user.id, req.body);
    return ok(res, { ...user, permissions: getPermissions(user.role) });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    clearRefreshCookie(res);
    return ok(res, { message: 'Password changed. Please log in again.' });
  } catch (err) {
    next(err);
  }
}

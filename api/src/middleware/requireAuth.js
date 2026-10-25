// src/middleware/requireAuth.js
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/**
 * requireAuth: verifies the access token, loads user from DB,
 * rejects inactive users and users whose company is inactive.
 *
 * Sets req.user = { id, role, companyId, email, fullName, isActive }
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw AppError.unauthenticated('Missing access token');
    }

    const token = authHeader.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
    } catch (err) {
      throw AppError.unauthenticated('Invalid or expired access token');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        company: { select: { status: true } },
      },
    });

    if (!user) throw AppError.unauthenticated('User not found');
    if (!user.isActive) throw AppError.unauthenticated('Account is inactive');
    if (user.company && user.company.status === 'inactive') {
      throw AppError.unauthenticated('Company is inactive');
    }

    // Attach to request — never include passwordHash
    req.user = {
      id: user.id,
      role: user.role,
      companyId: user.companyId ?? null,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      preferredLanguage: user.preferredLanguage,
    };

    next();
  } catch (err) {
    next(err);
  }
}

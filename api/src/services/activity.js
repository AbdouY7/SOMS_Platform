// src/services/activity.js
// Fire-and-forget audit logger.
// Rules:
//  - Never throws into the caller's flow.
//  - Strips any JSON key whose name includes: password, token, secret, hash.
import { prisma } from '../prisma.js';
import { logger } from '../utils/logger.js';

const SECRET_KEYS = /password|token|secret|hash/i;

function stripSecrets(obj, depth = 0) {
  if (depth > 5 || obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((v) => stripSecrets(v, depth + 1));
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([k]) => !SECRET_KEYS.test(k))
      .map(([k, v]) => [k, stripSecrets(v, depth + 1)])
  );
}

/**
 * Record an audit event.
 * @param {{ actorUserId?, companyId?, action, entityType?, entityId?, metadata?, ip? }} opts
 */
export async function record({
  actorUserId = null,
  companyId   = null,
  action,
  entityType  = null,
  entityId    = null,
  metadata    = null,
  ip          = null,
} = {}) {
  try {
    const safeMetadata = metadata ? stripSecrets(metadata) : null;
    await prisma.activityLog.create({
      data: {
        actorUserId,
        companyId,
        action,
        entityType,
        entityId,
        metadata: safeMetadata,
        ip,
      },
    });
  } catch (err) {
    logger.error({ err, action }, 'activity.record failed — event lost');
  }
}

// Convenience namespace so callers can write activityService.record({...})
export const activityService = { record };

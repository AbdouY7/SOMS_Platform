// src/prisma.js
// Singleton Prisma client.
// NOTE: System 0 has no models — the client is available but has no typed methods yet.
// System 1 will add the first models (companies, users, refresh_tokens).
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger.js';

let _prisma;

function getPrisma() {
  if (!_prisma) {
    _prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    _prisma.$on('error', (e) => {
      logger.error({ target: e.target, message: e.message }, 'Prisma error');
    });

    if (process.env.NODE_ENV === 'development') {
      _prisma.$on('query', (e) => {
        if (e.duration > 500) {
          logger.warn({ query: e.query, duration: e.duration }, 'Slow query detected');
        }
      });
    }
  }
  return _prisma;
}

// Export as a Proxy so callers like `prisma.$queryRaw` work whether or not there are models
export const prisma = new Proxy(
  {},
  {
    get(_target, prop) {
      return getPrisma()[prop];
    },
  }
);

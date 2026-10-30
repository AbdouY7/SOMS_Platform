// src/server.js
import 'dotenv/config';
import { env } from './config/env.js';
import app from './app.js';
import { prisma } from './prisma.js';
import { logger } from './utils/logger.js';
import { settingsService } from './services/settings.js';
import { ensureSuperAdmin } from './modules/auth/auth.service.js';

async function start() {
  // Seed super admin + settings before accepting traffic
  await ensureSuperAdmin();
  await settingsService.init();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 SOMS API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  // Graceful shutdown
  async function shutdown(signal) {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Server and database connection closed');
      process.exit(0);
    });
    setTimeout(() => { logger.error('Forced shutdown after timeout'); process.exit(1); }, 10_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  return server;
}

start().catch((err) => {
  logger.fatal({ err }, 'Startup failed');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection');
  process.exit(1);
});

// prisma/seed.js
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ensureSuperAdmin } from '../src/modules/auth/auth.service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  await ensureSuperAdmin();
  // System 3 will add: await seedSystemSettings(prisma);
  // System 4 will add: await seedWilayas(prisma);
  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

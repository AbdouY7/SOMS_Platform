// prisma/seed.js
// Entry point for seeding — each system registers its seed here.
// System 1 will add ensureSuperAdmin().
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  // System 1 will add: await ensureSuperAdmin(prisma);
  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

// tests/helpers/testDb.js
// Test database helpers: seed and clean up test data.
// Uses a separate test Prisma client.
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import crypto from 'crypto';

export const testPrisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

/**
 * Create a test company.
 */
export async function createTestCompany(overrides = {}) {
  return testPrisma.company.create({
    data: {
      name: overrides.name ?? 'Test Company',
      status: overrides.status ?? 'active',
      ...overrides,
    },
  });
}

/**
 * Create a test user.
 */
export async function createTestUser(overrides = {}) {
  const passwordHash = await argon2.hash(overrides.password ?? 'TestPass2024!', {
    type: argon2.argon2id,
  });
  return testPrisma.user.create({
    data: {
      fullName: overrides.fullName ?? 'Test User',
      email: overrides.email ?? `test_${crypto.randomUUID()}@example.com`,
      passwordHash,
      role: overrides.role ?? 'analyst',
      companyId: overrides.companyId ?? null,
      isActive: overrides.isActive ?? true,
    },
  });
}

/**
 * Reusable cross-company isolation test helper.
 * Asserts that a user from company A cannot access a resource belonging to company B.
 * @param {import('supertest').SuperTest} agent - authenticated agent (company A user)
 * @param {string} url - URL containing company B resource id
 * @param {string} method - HTTP method
 */
export function expectCrossCompany404(agent, url, method = 'get') {
  return agent[method](url).expect(404);
}

/**
 * Clean up all test data (run in afterAll).
 */
export async function cleanTestDb() {
  await testPrisma.refreshToken.deleteMany();
  await testPrisma.user.deleteMany({ where: { email: { contains: 'test_' } } });
  await testPrisma.company.deleteMany({ where: { name: { startsWith: 'Test ' } } });
}

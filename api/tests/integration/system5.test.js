// tests/integration/system5.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { testPrisma, createTestCompany, createTestUser, cleanTestDb } from '../helpers/testDb.js';

const PASS = 'TestPass2024!';

let adminToken;
let companyA, companyB;
let cadminA, cadminTokenA;
let analystA, analystTokenA;
let cadminB, cadminTokenB;

async function loginAs(email, password = PASS) {
  const r = await request(app).post('/api/auth/login').send({ email, password });
  return r.body.data?.accessToken;
}

beforeAll(async () => {
  adminToken = await loginAs(process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_PASSWORD);
  companyA = await createTestCompany({ name: 'Test S5 Company Alpha' });
  companyB = await createTestCompany({ name: 'Test S5 Company Beta' });

  cadminA = await createTestUser({ email: `test_s5_cadmin_a_${Date.now()}@x.com`, role: 'company_admin', companyId: companyA.id, password: PASS });
  analystA = await createTestUser({ email: `test_s5_analyst_a_${Date.now()}@x.com`, role: 'analyst', companyId: companyA.id, password: PASS });
  cadminB = await createTestUser({ email: `test_s5_cadmin_b_${Date.now()}@x.com`, role: 'company_admin', companyId: companyB.id, password: PASS });

  cadminTokenA = await loginAs(cadminA.email);
  analystTokenA = await loginAs(analystA.email);
  cadminTokenB = await loginAs(cadminB.email);

  // Seed sample real data for Company A:
  // Wilaya 16 (Algiers): 1000 clicks, 50 conversions, 20000 spend, 20 orders, 100000 revenue
  await testPrisma.regionalMetric.createMany({
    data: [
      {
        companyId: companyA.id,
        wilayaCode: '16',
        periodStart: new Date('2026-05-01'),
        periodEnd: new Date('2026-05-31'),
        metricType: 'clicks',
        metricValue: 1000,
        sourceType: 'csv_import',
      },
      {
        companyId: companyA.id,
        wilayaCode: '16',
        periodStart: new Date('2026-05-01'),
        periodEnd: new Date('2026-05-31'),
        metricType: 'conversions',
        metricValue: 50,
        sourceType: 'csv_import',
      },
      {
        companyId: companyA.id,
        wilayaCode: '16',
        periodStart: new Date('2026-05-01'),
        periodEnd: new Date('2026-05-31'),
        metricType: 'spend',
        metricValue: 20000,
        sourceType: 'csv_import',
      },
      // Previous period for Wilaya 16 (for compare test): 40 conversions
      {
        companyId: companyA.id,
        wilayaCode: '16',
        periodStart: new Date('2026-04-01'),
        periodEnd: new Date('2026-04-30'),
        metricType: 'conversions',
        metricValue: 40,
        sourceType: 'csv_import',
      },
      // Wilaya 31 (Oran): 500 clicks, 0 conversions (zero test)
      {
        companyId: companyA.id,
        wilayaCode: '31',
        periodStart: new Date('2026-05-01'),
        periodEnd: new Date('2026-05-31'),
        metricType: 'clicks',
        metricValue: 500,
        sourceType: 'csv_import',
      },
      {
        companyId: companyA.id,
        wilayaCode: '31',
        periodStart: new Date('2026-05-01'),
        periodEnd: new Date('2026-05-31'),
        metricType: 'conversions',
        metricValue: 0,
        sourceType: 'csv_import',
      },
      // Wilaya 25 (Constantine): 0 clicks (zero denominator test)
      {
        companyId: companyA.id,
        wilayaCode: '25',
        periodStart: new Date('2026-05-01'),
        periodEnd: new Date('2026-05-31'),
        metricType: 'clicks',
        metricValue: 0,
        sourceType: 'csv_import',
      },
      {
        companyId: companyA.id,
        wilayaCode: '25',
        periodStart: new Date('2026-05-01'),
        periodEnd: new Date('2026-05-31'),
        metricType: 'conversions',
        metricValue: 10,
        sourceType: 'csv_import',
      },
    ],
  });

  // Sales records for Company A
  await testPrisma.salesRecord.createMany({
    data: [
      {
        companyId: companyA.id,
        orderDate: new Date('2026-05-15'),
        wilayaCode: '16',
        productCategory: 'electronics',
        orderCount: 20,
        revenue: 100000,
        acquisitionCost: 5000,
        sourceType: 'csv_import',
      },
      {
        companyId: companyA.id,
        orderDate: new Date('2026-05-20'),
        wilayaCode: '31',
        productCategory: 'fashion',
        orderCount: 10,
        revenue: 40000,
        acquisitionCost: 2000,
        sourceType: 'csv_import',
      },
    ],
  });

  // Demo data for Company A (should NOT appear when dataMode=real)
  await testPrisma.regionalMetric.create({
    data: {
      companyId: companyA.id,
      wilayaCode: '09', // Blida
      periodStart: new Date('2026-05-01'),
      periodEnd: new Date('2026-05-31'),
      metricType: 'conversions',
      metricValue: 9999,
      sourceType: 'synthetic_demo',
    },
  });
});

afterAll(async () => {
  await cleanTestDb();
  await testPrisma.$disconnect();
});

// ── 1. GET /api/analytics/geo ─────────────────────────────────────────────────
describe('GET /api/analytics/geo', () => {
  it('returns all 58 wilayas with aggregated values and rankings', async () => {
    const r = await request(app)
      .get('/api/analytics/geo?start=2026-05-01&end=2026-05-31&metric=conversions&dataMode=real')
      .set('Authorization', `Bearer ${analystTokenA}`);

    expect(r.status).toBe(200);
    expect(r.body.data.wilayas.length).toBe(58);

    const w16 = r.body.data.wilayas.find((w) => w.code === '16');
    const w31 = r.body.data.wilayas.find((w) => w.code === '31');
    const w25 = r.body.data.wilayas.find((w) => w.code === '25');
    const w01 = r.body.data.wilayas.find((w) => w.code === '01'); // No data

    expect(w16.value).toBe(50);
    expect(w16.rank).toBe(1);

    expect(w25.value).toBe(10);
    expect(w25.rank).toBe(2);

    expect(w31.value).toBe(0);
    expect(w31.rank).toBe(3);

    expect(w01.value).toBeNull();
    expect(w01.rank).toBeNull();
    expect(r.body.data.missing).toContain('01');
  });

  it('calculates derived metric conversion_rate and safely returns null on zero clicks', async () => {
    const r = await request(app)
      .get('/api/analytics/geo?start=2026-05-01&end=2026-05-31&metric=conversion_rate&dataMode=real')
      .set('Authorization', `Bearer ${analystTokenA}`);

    expect(r.status).toBe(200);

    const w16 = r.body.data.wilayas.find((w) => w.code === '16');
    // 50 conversions / 1000 clicks * 100 = 5%
    expect(w16.value).toBe(5);

    const w31 = r.body.data.wilayas.find((w) => w.code === '31');
    // 0 conversions / 500 clicks * 100 = 0%
    expect(w31.value).toBe(0);

    const w25 = r.body.data.wilayas.find((w) => w.code === '25');
    // 10 conversions / 0 clicks -> null (never Infinity or NaN)
    expect(w25.value).toBeNull();
  });

  it('calculates average_order_value from sales records', async () => {
    const r = await request(app)
      .get('/api/analytics/geo?start=2026-05-01&end=2026-05-31&metric=average_order_value&dataMode=real')
      .set('Authorization', `Bearer ${analystTokenA}`);

    expect(r.status).toBe(200);

    const w16 = r.body.data.wilayas.find((w) => w.code === '16');
    // 100000 revenue / 20 orders = 5000 DZD
    expect(w16.value).toBe(5000);

    const w31 = r.body.data.wilayas.find((w) => w.code === '31');
    // 40000 revenue / 10 orders = 4000 DZD
    expect(w31.value).toBe(4000);
  });

  it('computes comparison with previous period and changePct', async () => {
    const r = await request(app)
      .get('/api/analytics/geo?start=2026-05-01&end=2026-05-31&metric=conversions&compare=true&dataMode=real')
      .set('Authorization', `Bearer ${analystTokenA}`);

    expect(r.status).toBe(200);

    const w16 = r.body.data.wilayas.find((w) => w.code === '16');
    expect(w16.value).toBe(50);
    expect(w16.previous).toBe(40);
    // (50 - 40) / 40 * 100 = 25%
    expect(w16.changePct).toBe(25);
  });

  it('isolates real and demo data (dataMode=real never includes synthetic_demo)', async () => {
    const realRes = await request(app)
      .get('/api/analytics/geo?start=2026-05-01&end=2026-05-31&metric=conversions&dataMode=real')
      .set('Authorization', `Bearer ${analystTokenA}`);

    const w09Real = realRes.body.data.wilayas.find((w) => w.code === '09');
    expect(w09Real.value).toBeNull(); // Blida has only synthetic_demo data

    const demoRes = await request(app)
      .get('/api/analytics/geo?start=2026-05-01&end=2026-05-31&metric=conversions&dataMode=demo')
      .set('Authorization', `Bearer ${analystTokenA}`);

    const w09Demo = demoRes.body.data.wilayas.find((w) => w.code === '09');
    expect(w09Demo.value).toBe(9999);
  });
});

// ── 2. GET /api/analytics/geo/:wilayaCode ─────────────────────────────────────
describe('GET /api/analytics/geo/:wilayaCode', () => {
  it('returns all metrics, derived rates, and trend series for a wilaya', async () => {
    const r = await request(app)
      .get('/api/analytics/geo/16?start=2026-05-01&end=2026-05-31&dataMode=real')
      .set('Authorization', `Bearer ${analystTokenA}`);

    expect(r.status).toBe(200);
    expect(r.body.data.wilaya.code).toBe('16');
    expect(r.body.data.wilaya.nameFr).toBe('Alger');
    expect(r.body.data.metrics.clicks).toBe(1000);
    expect(r.body.data.metrics.conversions).toBe(50);
    expect(r.body.data.derived.conversion_rate).toBe(5);
    expect(r.body.data.derived.average_order_value).toBe(5000);
    expect(Array.isArray(r.body.data.trends)).toBe(true);
    expect(r.body.data.hasData).toBe(true);
  });

  it('returns 404 for non-existent wilaya code', async () => {
    const r = await request(app)
      .get('/api/analytics/geo/99?dataMode=real')
      .set('Authorization', `Bearer ${analystTokenA}`);

    expect(r.status).toBe(404);
  });
});

// ── 3. GET /api/analytics/geo/compare ─────────────────────────────────────────
describe('GET /api/analytics/geo/compare', () => {
  it('compares 2 selected wilayas side-by-side', async () => {
    const r = await request(app)
      .get('/api/analytics/geo/compare?codes=16,31&start=2026-05-01&end=2026-05-31&dataMode=real')
      .set('Authorization', `Bearer ${analystTokenA}`);

    expect(r.status).toBe(200);
    expect(r.body.data.comparison.length).toBe(2);

    const c16 = r.body.data.comparison.find((c) => c.code === '16');
    const c31 = r.body.data.comparison.find((c) => c.code === '31');

    expect(c16.metrics.conversions).toBe(50);
    expect(c31.metrics.conversions).toBe(0);
  });

  it('rejects compare with fewer than 2 wilayas with 400', async () => {
    const r = await request(app)
      .get('/api/analytics/geo/compare?codes=16&dataMode=real')
      .set('Authorization', `Bearer ${analystTokenA}`);

    expect(r.status).toBe(400);
  });
});

// ── 4. Tenant Isolation & Permissions ─────────────────────────────────────────
describe('Tenant Isolation & Role Boundaries', () => {
  it('Company B cannot see Company A geo metrics (isolated company data)', async () => {
    const r = await request(app)
      .get('/api/analytics/geo?start=2026-05-01&end=2026-05-31&metric=conversions&dataMode=real')
      .set('Authorization', `Bearer ${cadminTokenB}`);

    expect(r.status).toBe(200);
    // Company B has no seeded data, all should be null
    r.body.data.wilayas.forEach((w) => expect(w.value).toBeNull());
    expect(r.body.data.missing.length).toBe(58);
  });

  it('Super admin without company gets 403 COMPANY_REQUIRED', async () => {
    const r = await request(app)
      .get('/api/analytics/geo')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(r.status).toBe(403);
  });
});


// tests/integration/system6.test.js
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { testPrisma, createTestCompany, createTestUser, cleanTestDb } from '../helpers/testDb.js';
import { analyticsClient } from '../../src/services/analyticsClient.js';

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
  companyA = await createTestCompany({ name: 'Test S6 Company Alpha' });
  companyB = await createTestCompany({ name: 'Test S6 Company Beta' });

  cadminA = await createTestUser({ email: `test_s6_cadmin_a_${Date.now()}@x.com`, role: 'company_admin', companyId: companyA.id, password: PASS });
  analystA = await createTestUser({ email: `test_s6_analyst_a_${Date.now()}@x.com`, role: 'analyst', companyId: companyA.id, password: PASS });
  cadminB = await createTestUser({ email: `test_s6_cadmin_b_${Date.now()}@x.com`, role: 'company_admin', companyId: companyB.id, password: PASS });

  cadminTokenA = await loginAs(cadminA.email);
  analystTokenA = await loginAs(analystA.email);
  cadminTokenB = await loginAs(cadminB.email);

  // Seed sales records for Company A:
  // Current period (May 2026): 20 orders, 100,000 DZD revenue
  // Previous period (April 2026): 10 orders, 40,000 DZD revenue
  await testPrisma.salesRecord.createMany({
    data: [
      {
        companyId: companyA.id,
        wilayaCode: '16',
        orderDate: new Date('2026-05-15'),
        orderCount: 20,
        revenue: 100000,
        sourceType: 'csv_import',
      },
      {
        companyId: companyA.id,
        wilayaCode: '31',
        orderDate: new Date('2026-05-20'),
        orderCount: 15,
        revenue: 75000,
        sourceType: 'csv_import',
      },
      {
        companyId: companyA.id,
        wilayaCode: '16',
        orderDate: new Date('2026-04-15'),
        orderCount: 10,
        revenue: 40000,
        sourceType: 'csv_import',
      },
    ],
  });

  // Seed regional metrics for Company A in current period
  await testPrisma.regionalMetric.createMany({
    data: [
      {
        companyId: companyA.id,
        wilayaCode: '16',
        periodStart: new Date('2026-05-01'),
        periodEnd: new Date('2026-05-31'),
        metricType: 'clicks',
        metricValue: 1200,
        sourceType: 'csv_import',
      },
      {
        companyId: companyA.id,
        wilayaCode: '16',
        periodStart: new Date('2026-05-01'),
        periodEnd: new Date('2026-05-31'),
        metricType: 'conversions',
        metricValue: 60,
        sourceType: 'csv_import',
      },
      {
        companyId: companyA.id,
        wilayaCode: '16',
        periodStart: new Date('2026-05-01'),
        periodEnd: new Date('2026-05-31'),
        metricType: 'spend',
        metricValue: 15000,
        sourceType: 'csv_import',
      },
      {
        companyId: companyA.id,
        wilayaCode: '16',
        periodStart: new Date('2026-05-01'),
        periodEnd: new Date('2026-05-31'),
        metricType: 'profit_margin',
        metricValue: 0.25,
        sourceType: 'csv_import',
      },
      {
        companyId: companyA.id,
        wilayaCode: '31',
        periodStart: new Date('2026-05-01'),
        periodEnd: new Date('2026-05-31'),
        metricType: 'clicks',
        metricValue: 600,
        sourceType: 'csv_import',
      },
      {
        companyId: companyA.id,
        wilayaCode: '31',
        periodStart: new Date('2026-05-01'),
        periodEnd: new Date('2026-05-31'),
        metricType: 'conversions',
        metricValue: 20,
        sourceType: 'csv_import',
      },
      {
        companyId: companyA.id,
        wilayaCode: '31',
        periodStart: new Date('2026-05-01'),
        periodEnd: new Date('2026-05-31'),
        metricType: 'spend',
        metricValue: 12000,
        sourceType: 'csv_import',
      },
      {
        companyId: companyA.id,
        wilayaCode: '31',
        periodStart: new Date('2026-05-01'),
        periodEnd: new Date('2026-05-31'),
        metricType: 'profit_margin',
        metricValue: 0.18,
        sourceType: 'csv_import',
      },
    ],
  });

  // Mock analyticsClient for Flask opportunity compute
  vi.spyOn(analyticsClient, 'post').mockImplementation(async (url, body) => {
    if (url === '/compute/opportunity-score') {
      const items = body.items || [];
      const results = items.map((it, idx) => ({
        wilayaCode: it.wilayaCode,
        score: idx === 0 ? 88.5 : 62.0,
        status: 'ok',
        featuresUsed: ['demandGrowth', 'conversionRate', 'leadsVolume', 'cac', 'margin'],
        featuresMissing: [],
        contributions: { demandGrowth: 26.5, conversionRate: 22.0, leadsVolume: 16.0, cac: 14.0, margin: 10.0 },
        reasons: ['Strong order demand growth (+100.0%)', 'Efficient acquisition cost'],
      }));
      return { data: { results } };
    }
    return { data: {} };
  });
});

afterAll(async () => {
  vi.restoreAllMocks();
  await cleanTestDb();
});

describe('System 6: Growth & Opportunity Scoring', () => {
  describe('GET /api/analytics/growth/summary', () => {
    it('returns totals, AOV and growth calculation for company data', async () => {
      const res = await request(app)
        .get('/api/analytics/growth/summary?start=2026-05-01&end=2026-05-31&granularity=month&dataMode=real')
        .set('Authorization', `Bearer ${cadminTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const d = res.body.data;
      expect(d.totals.sales).toBe(175000); // 100000 + 75000
      expect(d.totals.orders).toBe(35);    // 20 + 15
      expect(d.totals.aov).toBe(5000);     // 175000 / 35

      // Previous period had 40000 sales, 10 orders
      expect(d.previousTotals.sales).toBe(40000);
      expect(d.previousTotals.orders).toBe(10);
      expect(d.previousTotals.aov).toBe(4000);

      // Sales growth: (175000 - 40000) / 40000 * 100 = 337.5%
      expect(d.totals.salesGrowth).toEqual({ value: 337.5, state: 'normal' });
      // Orders growth: (35 - 10) / 10 * 100 = 250%
      expect(d.totals.ordersGrowth).toEqual({ value: 250, state: 'normal' });

      expect(Array.isArray(d.series)).toBe(true);
      expect(d.periodsAvailable).toBeGreaterThanOrEqual(1);
    });

    it('warns when periodsAvailable is below threshold', async () => {
      const res = await request(app)
        .get('/api/analytics/growth/summary?start=2026-05-01&end=2026-05-31&granularity=month&dataMode=real')
        .set('Authorization', `Bearer ${analystTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.warnings.length).toBeGreaterThan(0);
      expect(res.body.data.warnings[0]).toContain('recommended minimum');
    });

    it('enforces tenant isolation (Company B sees empty totals)', async () => {
      const res = await request(app)
        .get('/api/analytics/growth/summary?start=2026-05-01&end=2026-05-31&dataMode=real')
        .set('Authorization', `Bearer ${cadminTokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totals.sales).toBe(0);
      expect(res.body.data.totals.orders).toBe(0);
      expect(res.body.data.totals.aov).toBe(null);
      expect(res.body.data.totals.salesGrowth.state).toBe('no_activity');
    });

    it('rejects super admin without company with 403', async () => {
      const res = await request(app)
        .get('/api/analytics/growth/summary?dataMode=real')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/analytics/growth/opportunities', () => {
    it('returns ranked wilayas with score, rank, and localized names', async () => {
      const res = await request(app)
        .get('/api/analytics/growth/opportunities?start=2026-05-01&end=2026-05-31&dataMode=real')
        .set('Authorization', `Bearer ${cadminTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const d = res.body.data;
      expect(Array.isArray(d.results)).toBe(true);
      expect(d.results.length).toBe(2);

      const top = d.results[0];
      expect(top.rank).toBe(1);
      expect(top.score).toBe(88.5);
      expect(top.status).toBe('ok');
      expect(top.nameAr).toBeDefined();
      expect(top.nameFr).toBeDefined();
      expect(top.contributions).toBeDefined();
      expect(top.reasons.length).toBeGreaterThan(0);
      expect(d.disclaimer).toContain('exclusively on your company');
    });

    it('accepts and passes custom weights override', async () => {
      const weights = {
        demandGrowth: 40,
        conversionRate: 20,
        leadsVolume: 20,
        cac: 10,
        margin: 10,
      };

      const res = await request(app)
        .get(`/api/analytics/growth/opportunities?start=2026-05-01&end=2026-05-31&weights=${encodeURIComponent(JSON.stringify(weights))}&dataMode=real`)
        .set('Authorization', `Bearer ${analystTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.weightsUsed).toEqual(weights);
    });

    it('rejects weights that do not sum to 100 with 400 VALIDATION_ERROR', async () => {
      const badWeights = {
        demandGrowth: 50,
        conversionRate: 20,
        leadsVolume: 20,
        cac: 10,
        margin: 5, // sums to 105
      };

      const res = await request(app)
        .get(`/api/analytics/growth/opportunities?weights=${encodeURIComponent(JSON.stringify(badWeights))}&dataMode=real`)
        .set('Authorization', `Bearer ${cadminTokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('enforces tenant isolation on opportunities (Company B has 0 evaluated items)', async () => {
      const res = await request(app)
        .get('/api/analytics/growth/opportunities?start=2026-05-01&end=2026-05-31&dataMode=real')
        .set('Authorization', `Bearer ${cadminTokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.data.results.length).toBe(0);
    });
  });
});

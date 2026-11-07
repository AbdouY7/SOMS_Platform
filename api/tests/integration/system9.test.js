// tests/integration/system9.test.js
import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { testPrisma, createTestCompany, createTestUser } from '../helpers/testDb.js';
import { analyticsClient } from '../../src/services/analyticsClient.js';

const PASS = 'TestPass2024!';

let adminToken;
let companyA, companyB;
let cadminA, cadminTokenA;
let analystA, analystTokenA;
let viewerA, viewerTokenA;
let cadminB, cadminTokenB;

async function loginAs(email, password = PASS) {
  const r = await request(app).post('/api/auth/login').send({ email, password });
  return r.body.data?.accessToken;
}

beforeAll(async () => {
  adminToken = await loginAs(process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_PASSWORD);
  companyA = await createTestCompany({ name: 'Test S9 Company Alpha' });
  companyB = await createTestCompany({ name: 'Test S9 Company Beta' });

  cadminA = await createTestUser({ email: `test_s9_cadmin_a_${Date.now()}@x.com`, role: 'company_admin', companyId: companyA.id, password: PASS });
  analystA = await createTestUser({ email: `test_s9_analyst_a_${Date.now()}@x.com`, role: 'analyst', companyId: companyA.id, password: PASS });
  viewerA = await createTestUser({ email: `test_s9_viewer_a_${Date.now()}@x.com`, role: 'viewer', companyId: companyA.id, password: PASS });
  cadminB = await createTestUser({ email: `test_s9_cadmin_b_${Date.now()}@x.com`, role: 'company_admin', companyId: companyB.id, password: PASS });

  cadminTokenA = await loginAs(cadminA.email);
  analystTokenA = await loginAs(analystA.email);
  viewerTokenA = await loginAs(viewerA.email);
  cadminTokenB = await loginAs(cadminB.email);

  // Seed sample social post and sales record for company A
  await testPrisma.socialPost.create({
    data: {
      companyId: companyA.id,
      platform: 'instagram',
      externalPostId: `post_s9_${Date.now()}`,
      publishedAt: new Date('2026-05-10T14:00:00Z'),
      contentType: 'image',
      impressions: 1500,
      reach: 1200,
      likes: 120,
      comments: 15,
      shares: 8,
      sourceType: 'csv_import',
    },
  });

  await testPrisma.salesRecord.create({
    data: {
      companyId: companyA.id,
      orderDate: new Date('2026-05-12T10:00:00Z'),
      orderCount: 4,
      revenue: 18000,
      acquisitionCost: 2500,
      sourceType: 'csv_import',
    },
  });

  // Mock analyticsClient for scheduler or forecast calls if invoked
  vi.spyOn(analyticsClient, 'post').mockImplementation(async (url) => {
    if (url === '/compute/scheduler') {
      return {
        data: {
          heatmap: [],
          windows: [
            { day: 1, dayName: 'Lundi', startHour: 18, endHour: 20, confidence: 'high', avgEngagement: 140, score: 92 },
          ],
          bestSlots: [],
          insufficientData: false,
          totalPosts: 1,
        },
      };
    }
    if (url === '/compute/forecast') {
      return {
        data: {
          series: [],
          milestones: {},
          summary: { finalValue: 10000, pctOfK: 100, costPerResult: 15 },
          warnings: [],
        },
      };
    }
    return { data: {} };
  });
});

describe('System 9: Reports and Hub Landing Page', () => {
  let createdReportA1;
  let createdReportA2;

  // ── Hub Summary Tests ────────────────────────────────────────────────────────
  it('rejects GET /api/hub/summary without auth (401)', async () => {
    const res = await request(app).get('/api/hub/summary');
    expect(res.status).toBe(401);
  });

  it('returns hub summary for company A with KPI totals and module statuses', async () => {
    const res = await request(app)
      .get('/api/hub/summary')
      .set('Authorization', `Bearer ${viewerTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { kpiSummary, moduleStatus } = res.body.data;
    expect(kpiSummary.totalPosts).toBeGreaterThanOrEqual(1);
    expect(kpiSummary.totalSalesRecords).toBeGreaterThanOrEqual(1);
    expect(kpiSummary.totalRevenue).toBe(18000);
    expect(kpiSummary.totalOrders).toBe(4);
    expect(kpiSummary.totalSpend).toBe(2500);

    // Module flags
    expect(moduleStatus.scheduler.hasData).toBe(true);
    expect(moduleStatus.growth.hasData).toBe(true);
  });

  it('enforces tenant isolation on hub summary (Company B has 0 posts and 0 revenue)', async () => {
    const res = await request(app)
      .get('/api/hub/summary')
      .set('Authorization', `Bearer ${cadminTokenB}`);

    expect(res.status).toBe(200);
    const { kpiSummary } = res.body.data;
    expect(kpiSummary.totalPosts).toBe(0);
    expect(kpiSummary.totalSalesRecords).toBe(0);
    expect(kpiSummary.totalRevenue).toBe(0);
  });

  // ── Report Generation Tests ──────────────────────────────────────────────────
  it('rejects report creation without auth (401)', async () => {
    const res = await request(app).post('/api/reports').send({
      type: 'growth',
      title: 'Q2 Performance Summary',
    });
    expect(res.status).toBe(401);
  });

  it('rejects report creation by viewer (403)', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${viewerTokenA}`)
      .send({
        type: 'growth',
        title: 'Q2 Performance Summary',
      });
    expect(res.status).toBe(403);
  });

  it('validates report creation input (rejects invalid report type)', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${analystTokenA}`)
      .send({
        type: 'invalid_module',
        title: 'Bad Report',
      });
    expect(res.status).toBe(400);
  });

  it('creates growth report snapshot (analyst, 201) and logs activity', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${analystTokenA}`)
      .send({
        type: 'growth',
        title: 'Summer Growth Analysis 2026',
        start: '2026-05-01',
        end: '2026-05-31',
        filters: { granularity: 'month', metric: 'orders' },
        dataMode: 'real',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    createdReportA1 = res.body.data;

    expect(createdReportA1.id).toBeDefined();
    expect(createdReportA1.title).toBe('Summer Growth Analysis 2026');
    expect(createdReportA1.reportType).toBe('growth');
    expect(createdReportA1.snapshotJson.growth).toBeDefined();
    expect(createdReportA1.sourcesJson.socialPostsCount).toBeGreaterThanOrEqual(1);

    // Verify activity log
    const log = await testPrisma.activityLog.findFirst({
      where: { companyId: companyA.id, action: 'report.created' },
    });
    expect(log).toBeDefined();
    expect(log.entityId).toBe(createdReportA1.id);
  });

  it('creates combined multi-module report (cadmin, 201)', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .send({
        type: 'combined',
        title: '=Malicious Formula In Title', // Test formula injection escape
        start: '2026-05-01',
        end: '2026-05-31',
        dataMode: 'real',
      });

    expect(res.status).toBe(201);
    createdReportA2 = res.body.data;
    expect(createdReportA2.snapshotJson.growth).toBeDefined();
    expect(createdReportA2.snapshotJson.scheduler).toBeDefined();
  });

  // ── Report Retrieval & Tenant Isolation Tests ────────────────────────────────
  it('lists company reports (viewer, 200)', async () => {
    const res = await request(app)
      .get('/api/reports')
      .set('Authorization', `Bearer ${viewerTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.map((r) => r.id)).toContain(createdReportA1.id);
  });

  it('filters report list by type', async () => {
    const res = await request(app)
      .get('/api/reports?type=growth')
      .set('Authorization', `Bearer ${viewerTokenA}`);

    expect(res.status).toBe(200);
    const types = res.body.data.map((r) => r.reportType);
    expect(types.every((t) => t === 'growth')).toBe(true);
  });

  it('enforces tenant isolation on list (Company B sees 0 reports)', async () => {
    const res = await request(app)
      .get('/api/reports')
      .set('Authorization', `Bearer ${cadminTokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it('gets report by ID (viewer, 200)', async () => {
    const res = await request(app)
      .get(`/api/reports/${createdReportA1.id}`)
      .set('Authorization', `Bearer ${viewerTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdReportA1.id);
    expect(res.body.data.snapshotJson).toBeDefined();
  });

  it('enforces tenant isolation on GET by ID (Company B gets 404)', async () => {
    const res = await request(app)
      .get(`/api/reports/${createdReportA1.id}`)
      .set('Authorization', `Bearer ${cadminTokenB}`);

    expect(res.status).toBe(404);
  });

  // ── CSV Export & Injection Guard Tests ───────────────────────────────────────
  it('exports report as UTF-8 BOM CSV with formula injection protection', async () => {
    const res = await request(app)
      .get(`/api/reports/${createdReportA2.id}/export.csv`)
      .set('Authorization', `Bearer ${viewerTokenA}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');

    const csvText = res.text;

    // Must start with UTF-8 BOM
    expect(csvText.charCodeAt(0)).toBe(0xfeff);

    // Metadata headers must be present
    expect(csvText).toContain('# SOMS Analytics Report');
    expect(csvText).toContain('# Report Type: combined');

    // Formula injection guard test: title started with '=', should be escaped as "'="
    expect(csvText).toContain("'=");
  });

  it('enforces tenant isolation on CSV export (Company B gets 404)', async () => {
    const res = await request(app)
      .get(`/api/reports/${createdReportA1.id}/export.csv`)
      .set('Authorization', `Bearer ${cadminTokenB}`);

    expect(res.status).toBe(404);
  });

  // ── Report Deletion Tests ───────────────────────────────────────────────────
  it('rejects report deletion by analyst (403)', async () => {
    const res = await request(app)
      .delete(`/api/reports/${createdReportA2.id}`)
      .set('Authorization', `Bearer ${analystTokenA}`);

    expect(res.status).toBe(403);
  });

  it('enforces tenant isolation on DELETE (Company B gets 404)', async () => {
    const res = await request(app)
      .delete(`/api/reports/${createdReportA2.id}`)
      .set('Authorization', `Bearer ${cadminTokenB}`);

    expect(res.status).toBe(404);
  });

  it('allows company_admin to delete report (200) and logs activity', async () => {
    const res = await request(app)
      .delete(`/api/reports/${createdReportA2.id}`)
      .set('Authorization', `Bearer ${cadminTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify it is removed
    const getRes = await request(app)
      .get(`/api/reports/${createdReportA2.id}`)
      .set('Authorization', `Bearer ${cadminTokenA}`);
    expect(getRes.status).toBe(404);

    // Verify deletion log
    const log = await testPrisma.activityLog.findFirst({
      where: { companyId: companyA.id, action: 'report.deleted' },
    });
    expect(log).toBeDefined();
    expect(log.entityId).toBe(createdReportA2.id);
  });
});

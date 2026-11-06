// tests/integration/system7.test.js
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
let viewerA, viewerTokenA;
let cadminB, cadminTokenB;

async function loginAs(email, password = PASS) {
  const r = await request(app).post('/api/auth/login').send({ email, password });
  return r.body.data?.accessToken;
}

beforeAll(async () => {
  adminToken = await loginAs(process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_PASSWORD);
  companyA = await createTestCompany({ name: 'Test S7 Company Alpha' });
  companyB = await createTestCompany({ name: 'Test S7 Company Beta' });

  cadminA = await createTestUser({ email: `test_s7_cadmin_a_${Date.now()}@x.com`, role: 'company_admin', companyId: companyA.id, password: PASS });
  analystA = await createTestUser({ email: `test_s7_analyst_a_${Date.now()}@x.com`, role: 'analyst', companyId: companyA.id, password: PASS });
  viewerA = await createTestUser({ email: `test_s7_viewer_a_${Date.now()}@x.com`, role: 'viewer', companyId: companyA.id, password: PASS });
  cadminB = await createTestUser({ email: `test_s7_cadmin_b_${Date.now()}@x.com`, role: 'company_admin', companyId: companyB.id, password: PASS });

  cadminTokenA = await loginAs(cadminA.email);
  analystTokenA = await loginAs(analystA.email);
  viewerTokenA = await loginAs(viewerA.email);
  cadminTokenB = await loginAs(cadminB.email);

  // Seed sample social posts for Company A on Instagram
  const postsA = [];
  for (let i = 0; i < 35; i++) {
    postsA.push({
      companyId: companyA.id,
      platform: 'instagram',
      externalPostId: `ext_ig_${i}`,
      publishedAt: new Date(`2026-05-04T14:${String(i).padStart(2, '0')}:00Z`),
      likes: 120 + i,
      comments: 15,
      impressions: 1500,
      sourceType: 'csv_import',
    });
  }
  // Add 1 Facebook post for Company A to test platform isolation
  postsA.push({
    companyId: companyA.id,
    platform: 'facebook',
    externalPostId: 'ext_fb_1',
    publishedAt: new Date('2026-05-05T10:00:00Z'),
    likes: 50,
    comments: 5,
    impressions: 600,
    sourceType: 'csv_import',
  });

  await testPrisma.socialPost.createMany({ data: postsA });

  // Mock analyticsClient for Flask scheduler compute
  vi.spyOn(analyticsClient, 'post').mockImplementation(async (url, body) => {
    if (url === '/compute/scheduler') {
      const posts = body.posts || [];
      return {
        data: {
          metricUsed: body.metric === 'auto' ? 'engagement_rate' : body.metric,
          sample: {
            totalPosts: posts.length,
            usablePosts: posts.length,
            minRequired: body.minTotalPosts || 30,
            minSamplesPerSlot: body.minSamplesPerSlot || 5,
          },
          cells: Array.from({ length: 168 }, (_, i) => ({
            weekday: Math.floor(i / 24),
            hour: i % 24,
            postCount: i === 15 ? posts.length : 0,
            value: i === 15 ? 9.5 : 0,
            median: i === 15 ? 9.2 : 0,
          })),
          ranking: posts.length >= 5 ? [{ rank: 1, weekday: 0, hour: 15, median: 9.2, postCount: posts.length }] : [],
          recommendations: posts.length >= (body.minTotalPosts || 30)
            ? [{ weekday: 0, hour: 15, confidence: 'high', reason: 'Consistently high engagement' }]
            : [],
          warnings: posts.length < (body.minTotalPosts || 30) ? ['Insufficient sample'] : [],
        },
      };
    }
    return { data: {} };
  });
});

afterAll(async () => {
  vi.restoreAllMocks();
  await cleanTestDb();
});

describe('System 7: Scheduler Analytics & Internal Plan', () => {
  describe('GET /api/analytics/scheduler', () => {
    it('requires platform parameter (rejects with 400 if missing)', async () => {
      const res = await request(app)
        .get('/api/analytics/scheduler?dataMode=real')
        .set('Authorization', `Bearer ${cadminTokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns heatmap cells, sample stats, and recommendations for Instagram', async () => {
      const res = await request(app)
        .get('/api/analytics/scheduler?platform=instagram&dataMode=real')
        .set('Authorization', `Bearer ${cadminTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const d = res.body.data;
      expect(d.platform).toBe('instagram');
      expect(d.sample.totalPosts).toBe(35);
      expect(d.cells.length).toBe(168); // 7 * 24
      expect(d.ranking.length).toBe(1);
      expect(d.recommendations.length).toBe(1);
      expect(d.recommendations[0].confidence).toBe('high');
    });

    it('enforces platform isolation (Facebook query only sees 1 post)', async () => {
      const res = await request(app)
        .get('/api/analytics/scheduler?platform=facebook&dataMode=real')
        .set('Authorization', `Bearer ${cadminTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sample.totalPosts).toBe(1);
    });

    it('enforces tenant isolation (Company B sees 0 posts)', async () => {
      const res = await request(app)
        .get('/api/analytics/scheduler?platform=instagram&dataMode=real')
        .set('Authorization', `Bearer ${cadminTokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sample.totalPosts).toBe(0);
    });

    it('rejects super admin without company with 403', async () => {
      const res = await request(app)
        .get('/api/analytics/scheduler?platform=instagram')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Internal Schedule Plan CRUD: /api/schedule/items', () => {
    let createdItemId;

    it('allows company_admin and analyst to create a planned post item (201)', async () => {
      const plannedDate = new Date(Date.now() + 86400000).toISOString();
      const res = await request(app)
        .post('/api/schedule/items')
        .set('Authorization', `Bearer ${analystTokenA}`)
        .send({
          platform: 'instagram',
          plannedAt: plannedDate,
          title: 'Summer Launch Carousel',
          contentType: 'carousel',
          notes: 'Highlight top 3 best-selling products',
          status: 'planned',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      const item = res.body.data;
      expect(item.id).toBeDefined();
      expect(item.title).toBe('Summer Launch Carousel');
      expect(item.status).toBe('planned');
      expect(item.companyId).toBe(companyA.id);

      createdItemId = item.id;
    });

    it('forbids viewer from creating a planned post item (403)', async () => {
      const res = await request(app)
        .post('/api/schedule/items')
        .set('Authorization', `Bearer ${viewerTokenA}`)
        .send({
          platform: 'instagram',
          plannedAt: new Date().toISOString(),
          title: 'Unauthorized post',
        });

      expect(res.status).toBe(403);
    });

    it('lists planned items for the company', async () => {
      const res = await request(app)
        .get('/api/schedule/items')
        .set('Authorization', `Bearer ${viewerTokenA}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((it) => it.id === createdItemId)).toBe(true);
    });

    it('updates planned item status and title', async () => {
      const res = await request(app)
        .patch(`/api/schedule/items/${createdItemId}`)
        .set('Authorization', `Bearer ${cadminTokenA}`)
        .send({
          title: 'Updated Summer Launch Carousel',
          status: 'done',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Summer Launch Carousel');
      expect(res.body.data.status).toBe('done');
    });

    it('prevents cross-company update or deletion (returns 404)', async () => {
      const patchRes = await request(app)
        .patch(`/api/schedule/items/${createdItemId}`)
        .set('Authorization', `Bearer ${cadminTokenB}`)
        .send({ title: 'Hacked Title' });

      expect(patchRes.status).toBe(404);

      const deleteRes = await request(app)
        .delete(`/api/schedule/items/${createdItemId}`)
        .set('Authorization', `Bearer ${cadminTokenB}`);

      expect(deleteRes.status).toBe(404);
    });

    it('deletes planned item cleanly', async () => {
      const res = await request(app)
        .delete(`/api/schedule/items/${createdItemId}`)
        .set('Authorization', `Bearer ${cadminTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);

      // Verify it no longer exists
      const listRes = await request(app)
        .get('/api/schedule/items')
        .set('Authorization', `Bearer ${cadminTokenA}`);

      expect(listRes.body.data.some((it) => it.id === createdItemId)).toBe(false);
    });
  });
});


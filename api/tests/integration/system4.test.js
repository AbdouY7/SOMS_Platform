// tests/integration/system4.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { testPrisma, createTestCompany, createTestUser, cleanTestDb, expectCrossCompany404 } from '../helpers/testDb.js';

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
  companyA = await createTestCompany({ name: 'Test S4 Company Alpha' });
  companyB = await createTestCompany({ name: 'Test S4 Company Beta' });

  cadminA = await createTestUser({ email: `test_s4_cadmin_a_${Date.now()}@x.com`, role: 'company_admin', companyId: companyA.id, password: PASS });
  analystA = await createTestUser({ email: `test_s4_analyst_a_${Date.now()}@x.com`, role: 'analyst', companyId: companyA.id, password: PASS });
  cadminB = await createTestUser({ email: `test_s4_cadmin_b_${Date.now()}@x.com`, role: 'company_admin', companyId: companyB.id, password: PASS });

  cadminTokenA = await loginAs(cadminA.email);
  analystTokenA = await loginAs(analystA.email);
  cadminTokenB = await loginAs(cadminB.email);
});

afterAll(async () => {
  await cleanTestDb();
  await testPrisma.$disconnect();
});

// ── 1. Wilayas Reference API ──────────────────────────────────────────────────
describe('GET /api/wilayas', () => {
  it('authenticated user gets all 58 wilayas sorted by code', async () => {
    const r = await request(app)
      .get('/api/wilayas')
      .set('Authorization', `Bearer ${analystTokenA}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data)).toBe(true);
    expect(r.body.data.length).toBe(58);
    expect(r.body.data[0].code).toBe('01');
    expect(r.body.data[15].code).toBe('16');
    expect(r.body.data[15].nameFr).toBe('Alger');
  });

  it('unauthenticated request returns 401', async () => {
    const r = await request(app).get('/api/wilayas');
    expect(r.status).toBe(401);
  });
});

// ── 2. Templates Download ────────────────────────────────────────────────────
describe('GET /api/imports/template/:type', () => {
  it('returns valid CSV template with UTF-8 BOM for social_posts', async () => {
    const r = await request(app)
      .get('/api/imports/template/social_posts')
      .set('Authorization', `Bearer ${cadminTokenA}`);
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toContain('text/csv');
    expect(r.text.charCodeAt(0)).toBe(0xfeff); // BOM
    expect(r.text).toContain('platform,external_post_id,published_at');
  });

  it('returns template for regional_metrics', async () => {
    const r = await request(app)
      .get('/api/imports/template/regional_metrics')
      .set('Authorization', `Bearer ${cadminTokenA}`);
    expect(r.status).toBe(200);
    expect(r.text).toContain('wilaya,period_start,period_end,metric_type,metric_value');
  });

  it('returns template for sales_records', async () => {
    const r = await request(app)
      .get('/api/imports/template/sales_records')
      .set('Authorization', `Bearer ${cadminTokenA}`);
    expect(r.status).toBe(200);
    expect(r.text).toContain('order_date,wilaya,product_category,order_count,revenue');
  });

  it('returns 400 for unknown type', async () => {
    const r = await request(app)
      .get('/api/imports/template/unknown_type')
      .set('Authorization', `Bearer ${cadminTokenA}`);
    expect(r.status).toBe(400);
  });
});

// ── 3. CSV Preview ───────────────────────────────────────────────────────────
describe('POST /api/imports/preview', () => {
  it('previews a valid social_posts CSV', async () => {
    const csvContent =
      'platform,external_post_id,published_at,content_type,likes,comments,shares,views,clicks\n' +
      'instagram,post_001,2026-05-01T12:00:00Z,reel,150,20,5,3000,80\n' +
      'facebook,post_002,2026-05-02T14:30:00Z,image,210,35,12,4500,120\n';

    const r = await request(app)
      .post('/api/imports/preview')
      .set('Authorization', `Bearer ${analystTokenA}`)
      .field('type', 'social_posts')
      .field('mode', 'append')
      .field('onError', 'skip_invalid')
      .attach('file', Buffer.from(csvContent, 'utf8'), 'posts.csv');

    expect(r.status).toBe(201);
    expect(r.body.data.importId).toBeDefined();
    expect(r.body.data.totalRows).toBe(2);
    expect(r.body.data.validCount).toBe(2);
    expect(r.body.data.rejectedRows).toBe(0);
    expect(r.body.data.delimiter).toBe(',');
  });

  it('handles semicolon delimiter, BOM, and Arabic wilaya name for regional_metrics', async () => {
    const csvContent =
      '\uFEFFwilaya;period_start;period_end;metric_type;metric_value\n' +
      'الجزائر;2026-05-01;2026-05-31;impressions;15000\n' +
      'وهران;2026-05-01;2026-05-31;clicks;850\n';

    const r = await request(app)
      .post('/api/imports/preview')
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .field('type', 'regional_metrics')
      .attach('file', Buffer.from(csvContent, 'utf8'), 'regional.csv');

    expect(r.status).toBe(201);
    expect(r.body.data.delimiter).toBe(';');
    expect(r.body.data.validCount).toBe(2);
    expect(r.body.data.rejectedRows).toBe(0);
  });

  it('identifies invalid rows with precise errors and row numbers', async () => {
    const csvContent =
      'platform,external_post_id,published_at,likes\n' +
      'instagram,post_good,2026-05-01,100\n' +
      'invalid_platform,post_bad1,2026-05-01,50\n' +
      'facebook,post_bad2,not-a-date,50\n' +
      'facebook,post_bad3,2026-05-01,-10\n';

    const r = await request(app)
      .post('/api/imports/preview')
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .field('type', 'social_posts')
      .attach('file', Buffer.from(csvContent, 'utf8'), 'invalid.csv');

    expect(r.status).toBe(201);
    expect(r.body.data.totalRows).toBe(4);
    expect(r.body.data.validCount).toBe(1);
    expect(r.body.data.rejectedRows).toBe(3);
    expect(r.body.data.errors.length).toBeGreaterThanOrEqual(3);

    const errorCodes = r.body.data.errors.map((e) => e.errorCode);
    expect(errorCodes).toContain('INVALID_ENUM');
    expect(errorCodes).toContain('INVALID_DATE');
    expect(errorCodes).toContain('NEGATIVE_NUMBER');
  });

  it('rejects empty file with 400 EMPTY_FILE', async () => {
    const r = await request(app)
      .post('/api/imports/preview')
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .field('type', 'social_posts')
      .attach('file', Buffer.from('', 'utf8'), 'empty.csv');

    expect(r.status).toBe(400);
  });

  it('rejects file missing required columns with 400 MISSING_COLUMNS', async () => {
    const r = await request(app)
      .post('/api/imports/preview')
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .field('type', 'social_posts')
      .attach('file', Buffer.from('external_post_id,likes\np1,10\n', 'utf8'), 'incomplete.csv');

    expect(r.status).toBe(400);
    expect(r.body.error?.code).toBe('MISSING_COLUMNS');
  });
});

// ── 4. CSV Commit & Duplicate Handling ────────────────────────────────────────
describe('POST /api/imports/:id/commit', () => {
  let validImportId;

  it('commits valid rows to database and marks status completed', async () => {
    const csvContent =
      'platform,external_post_id,published_at,likes,comments\n' +
      `instagram,commit_post_1_${Date.now()},2026-05-01T10:00:00Z,100,10\n` +
      `facebook,commit_post_2_${Date.now()},2026-05-02T10:00:00Z,200,20\n`;

    const prevRes = await request(app)
      .post('/api/imports/preview')
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .field('type', 'social_posts')
      .attach('file', Buffer.from(csvContent, 'utf8'), 'posts_to_commit.csv');

    validImportId = prevRes.body.data.importId;

    const commitRes = await request(app)
      .post(`/api/imports/${validImportId}/commit`)
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .send({ mode: 'append' });

    expect(commitRes.status).toBe(200);
    expect(commitRes.body.data.status).toBe('completed');
    expect(commitRes.body.data.acceptedRows).toBe(2);

    // Verify in database
    const inDb = await testPrisma.socialPost.findMany({
      where: { companyId: companyA.id, importId: validImportId },
    });
    expect(inDb.length).toBe(2);
    expect(inDb[0].sourceType).toBe('csv_import');
  });

  it('double commit returns 409 conflict', async () => {
    const r = await request(app)
      .post(`/api/imports/${validImportId}/commit`)
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .send({ mode: 'append' });

    expect(r.status).toBe(409);
  });

  it('aborts commit when onError = abort and there are invalid rows', async () => {
    const csvContent =
      'platform,external_post_id,published_at,likes\n' +
      `instagram,abort_post_1_${Date.now()},2026-05-01,100\n` +
      `invalid_plat,abort_post_2_${Date.now()},2026-05-02,200\n`;

    const prevRes = await request(app)
      .post('/api/imports/preview')
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .field('type', 'social_posts')
      .field('onError', 'abort')
      .attach('file', Buffer.from(csvContent, 'utf8'), 'abort_test.csv');

    const importId = prevRes.body.data.importId;

    const commitRes = await request(app)
      .post(`/api/imports/${importId}/commit`)
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .send({ onError: 'abort' });

    expect(commitRes.status).toBe(200);
    expect(commitRes.body.data.status).toBe('failed');
    expect(commitRes.body.data.acceptedRows).toBe(0);

    const inDb = await testPrisma.socialPost.count({ where: { importId } });
    expect(inDb).toBe(0);
  });

  it('commits sales_records CSV cleanly', async () => {
    const csvContent =
      'order_date,wilaya,product_category,order_count,revenue,acquisition_cost\n' +
      '2026-05-10,16,electronics,15,120000.50,15000\n' +
      '2026-05-11,31,fashion,8,45000,5000\n';

    const prevRes = await request(app)
      .post('/api/imports/preview')
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .field('type', 'sales_records')
      .attach('file', Buffer.from(csvContent, 'utf8'), 'sales.csv');

    const importId = prevRes.body.data.importId;

    const commitRes = await request(app)
      .post(`/api/imports/${importId}/commit`)
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .send({ mode: 'append' });

    expect(commitRes.status).toBe(200);
    expect(commitRes.body.data.status).toBe('completed');
    expect(commitRes.body.data.acceptedRows).toBe(2);

    const salesInDb = await testPrisma.salesRecord.findMany({ where: { importId } });
    expect(salesInDb.length).toBe(2);
    expect(salesInDb[0].wilayaCode).toBe('16');
  });
});

// ── 5. Import Details & Error CSV Export ───────────────────────────────────────
describe('Import inspection and error reporting', () => {
  let importWithErrorsId;

  beforeAll(async () => {
    const csvContent =
      'platform,external_post_id,published_at,likes\n' +
      `instagram,err_p1_${Date.now()},2026-05-01,100\n` +
      `bad_plat,err_p2_${Date.now()},2026-05-01,50\n`;

    const prev = await request(app)
      .post('/api/imports/preview')
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .field('type', 'social_posts')
      .attach('file', Buffer.from(csvContent, 'utf8'), 'with_errs.csv');

    importWithErrorsId = prev.body.data.importId;
    await request(app)
      .post(`/api/imports/${importWithErrorsId}/commit`)
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .send({ mode: 'append', onError: 'skip_invalid' });
  });

  it('GET /api/imports returns paginated imports history', async () => {
    const r = await request(app)
      .get('/api/imports')
      .set('Authorization', `Bearer ${analystTokenA}`);
    expect(r.status).toBe(200);
    expect(r.body.data.items.length).toBeGreaterThan(0);
    expect(r.body.data.pagination).toBeDefined();
  });

  it('GET /api/imports/:id returns detail with errors summary', async () => {
    const r = await request(app)
      .get(`/api/imports/${importWithErrorsId}`)
      .set('Authorization', `Bearer ${analystTokenA}`);
    expect(r.status).toBe(200);
    expect(r.body.data.id).toBe(importWithErrorsId);
    expect(r.body.data.errors.length).toBe(1);
    expect(r.body.data.errors[0].errorCode).toBe('INVALID_ENUM');
  });

  it('GET /api/imports/:id/errors.csv exports downloadable error CSV report', async () => {
    const r = await request(app)
      .get(`/api/imports/${importWithErrorsId}/errors.csv`)
      .set('Authorization', `Bearer ${analystTokenA}`);
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toContain('text/csv');
    expect(r.text).toContain('row_number,column,error_code,message');
    expect(r.text).toContain('INVALID_ENUM');
  });
});

// ── 6. Rollback ───────────────────────────────────────────────────────────────
describe('POST /api/imports/:id/rollback', () => {
  it('company_admin can rollback completed import and purge its records', async () => {
    const csvContent =
      'platform,external_post_id,published_at,likes\n' +
      `instagram,rb_post_${Date.now()},2026-05-01,10\n`;

    const prev = await request(app)
      .post('/api/imports/preview')
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .field('type', 'social_posts')
      .attach('file', Buffer.from(csvContent, 'utf8'), 'rb.csv');

    const importId = prev.body.data.importId;
    await request(app).post(`/api/imports/${importId}/commit`).set('Authorization', `Bearer ${cadminTokenA}`);

    expect(await testPrisma.socialPost.count({ where: { importId } })).toBe(1);

    const rbRes = await request(app)
      .post(`/api/imports/${importId}/rollback`)
      .set('Authorization', `Bearer ${cadminTokenA}`);

    expect(rbRes.status).toBe(200);
    expect(rbRes.body.data.status).toBe('cancelled');
    expect(await testPrisma.socialPost.count({ where: { importId } })).toBe(0);
  });

  it('analyst cannot rollback (403 forbidden)', async () => {
    const r = await request(app)
      .post('/api/imports/00000000-0000-0000-0000-000000000000/rollback')
      .set('Authorization', `Bearer ${analystTokenA}`);
    expect(r.status).toBe(403);
  });
});

// ── 7. Public Posts Manual CRUD ──────────────────────────────────────────────
describe('Public Posts CRUD (/api/posts)', () => {
  let createdPostId;

  it('creates a manual public post with source_type = public_manual', async () => {
    const r = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${analystTokenA}`)
      .send({
        platform: 'instagram',
        externalPostId: `man_post_${Date.now()}`,
        publishedAt: '2026-05-01T15:00:00Z',
        contentType: 'image',
        captionPublic: 'New product announcement',
        likes: 350,
        comments: 42,
      });

    expect(r.status).toBe(201);
    expect(r.body.data.id).toBeDefined();
    expect(r.body.data.sourceType).toBe('public_manual');
    createdPostId = r.body.data.id;
  });

  it('rejects post with future date', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 5).toISOString();
    const r = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${analystTokenA}`)
      .send({
        platform: 'instagram',
        publishedAt: futureDate,
      });

    expect(r.status).toBe(400);
  });

  it('lists posts filtered by platform', async () => {
    const r = await request(app)
      .get('/api/posts?platform=instagram')
      .set('Authorization', `Bearer ${analystTokenA}`);

    expect(r.status).toBe(200);
    expect(r.body.data.items.length).toBeGreaterThan(0);
    r.body.data.items.forEach((p) => expect(p.platform).toBe('instagram'));
  });

  it('updates a manual post', async () => {
    const r = await request(app)
      .patch(`/api/posts/${createdPostId}`)
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .send({ likes: 500 });

    expect(r.status).toBe(200);
    expect(r.body.data.likes).toBe(500);
  });

  it('deletes a post', async () => {
    const r = await request(app)
      .delete(`/api/posts/${createdPostId}`)
      .set('Authorization', `Bearer ${cadminTokenA}`);

    expect(r.status).toBe(200);
    const inDb = await testPrisma.socialPost.findUnique({ where: { id: createdPostId } });
    expect(inDb).toBeNull();
  });
});

// ── 8. Cross-Company Isolation (Tenant Boundary) ─────────────────────────────
describe('Tenant Isolation Checks', () => {
  let importAId;
  let postAId;

  beforeAll(async () => {
    // Create an import and post belonging to Company A
    const csv = 'platform,published_at\ninstagram,2026-05-01\n';
    const prev = await request(app)
      .post('/api/imports/preview')
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .field('type', 'social_posts')
      .attach('file', Buffer.from(csv, 'utf8'), 'isolation.csv');
    importAId = prev.body.data.importId;

    const p = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .send({ platform: 'facebook', publishedAt: '2026-05-01T10:00:00Z', likes: 10 });
    postAId = p.body.data.id;
  });

  it('Company B user cannot view Company A import (404)', async () => {
    const r = await request(app)
      .get(`/api/imports/${importAId}`)
      .set('Authorization', `Bearer ${cadminTokenB}`);
    expect(r.status).toBe(404);
  });

  it('Company B user cannot commit Company A import (404)', async () => {
    const r = await request(app)
      .post(`/api/imports/${importAId}/commit`)
      .set('Authorization', `Bearer ${cadminTokenB}`)
      .send({ mode: 'append' });
    expect(r.status).toBe(404);
  });

  it('Company B user cannot view Company A post (404)', async () => {
    const r = await request(app)
      .patch(`/api/posts/${postAId}`)
      .set('Authorization', `Bearer ${cadminTokenB}`)
      .send({ likes: 999 });
    expect(r.status).toBe(404);
  });

  it('Company B user cannot delete Company A post (404)', async () => {
    const r = await request(app)
      .delete(`/api/posts/${postAId}`)
      .set('Authorization', `Bearer ${cadminTokenB}`);
    expect(r.status).toBe(404);
  });
});

// ── 9. Demo Data Generator ───────────────────────────────────────────────────
describe('Demo Data (/api/admin/demo-data)', () => {
  it('super_admin can seed synthetic demo data for a company', async () => {
    const r = await request(app)
      .post(`/api/admin/demo-data/${companyA.id}/seed`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(r.status).toBe(200);

    const demoPosts = await testPrisma.socialPost.count({
      where: { companyId: companyA.id, sourceType: 'synthetic_demo' },
    });
    expect(demoPosts).toBeGreaterThan(0);

    const demoMetrics = await testPrisma.regionalMetric.count({
      where: { companyId: companyA.id, sourceType: 'synthetic_demo' },
    });
    expect(demoMetrics).toBeGreaterThan(0);
  });

  it('seeding again is idempotent', async () => {
    const r = await request(app)
      .post(`/api/admin/demo-data/${companyA.id}/seed`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(r.status).toBe(200);
    expect(r.body.data.skipped).toBe(true);
  });

  it('super_admin can purge demo data without deleting real data', async () => {
    // Insert a real manual post to prove it survives purge
    const realPost = await testPrisma.socialPost.create({
      data: {
        companyId: companyA.id,
        platform: 'instagram',
        publishedAt: new Date(),
        sourceType: 'public_manual',
      },
    });

    const r = await request(app)
      .post(`/api/admin/demo-data/${companyA.id}/purge`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(r.status).toBe(200);

    // Verify synthetic rows are gone
    const demoCount = await testPrisma.socialPost.count({
      where: { companyId: companyA.id, sourceType: 'synthetic_demo' },
    });
    expect(demoCount).toBe(0);

    // Verify real post still exists!
    const realExists = await testPrisma.socialPost.findUnique({ where: { id: realPost.id } });
    expect(realExists).not.toBeNull();
  });

  it('company_admin cannot seed demo data (403 forbidden)', async () => {
    const r = await request(app)
      .post(`/api/admin/demo-data/${companyA.id}/seed`)
      .set('Authorization', `Bearer ${cadminTokenA}`);

    expect(r.status).toBe(403);
  });
});


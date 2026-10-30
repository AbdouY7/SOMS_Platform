// tests/integration/system3.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { testPrisma, createTestCompany, createTestUser, cleanTestDb } from '../helpers/testDb.js';

const PASS = 'TestPass2024!';

let adminToken;
let companyA, companyB;
let cadmin, cadminToken;
let analyst, analystToken;

async function loginAs(email, password = PASS) {
  const r = await request(app).post('/api/auth/login').send({ email, password });
  return r.body.data?.accessToken;
}

beforeAll(async () => {
  adminToken  = await loginAs(process.env.SUPERADMIN_EMAIL, process.env.SUPERADMIN_PASSWORD);
  companyA    = await createTestCompany({ name: 'Test S3 Company A' });
  companyB    = await createTestCompany({ name: 'Test S3 Company B' });
  cadmin      = await createTestUser({ email: `test_s3_cadmin_${Date.now()}@x.com`, role: 'company_admin', companyId: companyA.id, password: PASS });
  analyst     = await createTestUser({ email: `test_s3_analyst_${Date.now()}@x.com`, role: 'analyst',       companyId: companyA.id, password: PASS });
  cadminToken  = await loginAs(cadmin.email);
  analystToken = await loginAs(analyst.email);
});

afterAll(async () => {
  await cleanTestDb();
  await testPrisma.$disconnect();
});

// ── Admin: list users ─────────────────────────────────────────────────────────
describe('GET /api/admin/users', () => {
  it('super_admin gets paginated list', async () => {
    const r = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data)).toBe(true);
    expect(r.body.meta).toBeDefined();
  });

  it('filters by companyId', async () => {
    const r = await request(app)
      .get(`/api/admin/users?companyId=${companyA.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    r.body.data.forEach((u) => expect(u.companyId).toBe(companyA.id));
  });

  it('company_admin gets 403', async () => {
    const r = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${cadminToken}`);
    expect(r.status).toBe(403);
  });
});

// ── Admin: create user ────────────────────────────────────────────────────────
describe('POST /api/admin/users', () => {
  let createdUserId;

  it('super_admin can create a company user', async () => {
    const r = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'New Viewer', email: `test_s3_viewer_${Date.now()}@x.com`, password: 'ViewerPass2024!', role: 'viewer', companyId: companyA.id });
    expect(r.status).toBe(201);
    createdUserId = r.body.data.id;
  });

  it('duplicate email returns 409', async () => {
    const r = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Dup', email: cadmin.email, password: 'DupPass2024!', role: 'viewer', companyId: companyA.id });
    expect(r.status).toBe(409);
  });

  afterAll(async () => {
    if (createdUserId) await testPrisma.user.deleteMany({ where: { id: createdUserId } });
  });
});

// ── Admin: update user ────────────────────────────────────────────────────────
describe('PATCH /api/admin/users/:id', () => {
  it('super_admin can update fullName', async () => {
    const r = await request(app)
      .patch(`/api/admin/users/${analyst.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Updated Analyst Name' });
    expect(r.status).toBe(200);
    expect(r.body.data.fullName).toBe('Updated Analyst Name');
  });
});

// ── Admin: deactivate user ────────────────────────────────────────────────────
describe('PATCH /api/admin/users/:id/status', () => {
  it('deactivating a user revokes tokens and blocks refresh', async () => {
    const user = await createTestUser({ email: `test_s3_todeac_${Date.now()}@x.com`, role: 'analyst', companyId: companyA.id, password: PASS });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: user.email, password: PASS });

    // Deactivate
    const deac = await request(app)
      .patch(`/api/admin/users/${user.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(deac.status).toBe(200);

    // Refresh token should now fail
    const refresh = await agent.post('/api/auth/refresh');
    expect(refresh.status).toBe(401);

    await testPrisma.user.deleteMany({ where: { id: user.id } });
  });

  it('cannot deactivate self', async () => {
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`);
    const selfId = me.body.data.id;
    const r = await request(app)
      .patch(`/api/admin/users/${selfId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('CANNOT_DEACTIVATE_SELF');
  });
});

// ── Cannot remove last company admin ─────────────────────────────────────────
describe('Last company_admin guard', () => {
  it('deactivating the only company_admin returns 400', async () => {
    const r = await request(app)
      .patch(`/api/admin/users/${cadmin.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe('LAST_COMPANY_ADMIN');
  });
});

// ── Reset password ────────────────────────────────────────────────────────────
describe('POST /api/admin/users/:id/reset-password', () => {
  it('returns a temp password and revokes sessions', async () => {
    const user = await createTestUser({ email: `test_s3_rst_${Date.now()}@x.com`, role: 'analyst', companyId: companyA.id, password: PASS });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: user.email, password: PASS });

    const r = await request(app)
      .post(`/api/admin/users/${user.id}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(typeof r.body.data.tempPassword).toBe('string');
    expect(r.body.data.tempPassword.length).toBe(16);

    // Sessions revoked
    const refresh = await agent.post('/api/auth/refresh');
    expect(refresh.status).toBe(401);

    // Can login with temp password
    const login = await request(app).post('/api/auth/login').send({ email: user.email, password: r.body.data.tempPassword });
    expect(login.status).toBe(200);

    await testPrisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await testPrisma.user.deleteMany({ where: { id: user.id } });
  });
});

// ── Company users: scoped isolation ──────────────────────────────────────────
describe('GET /api/company/users', () => {
  it('company_admin sees only own company users', async () => {
    const r = await request(app).get('/api/company/users').set('Authorization', `Bearer ${cadminToken}`);
    expect(r.status).toBe(200);
    r.body.data.forEach((u) => expect(u.companyId).toBe(companyA.id));
  });

  it('cross-company user returns 404 on update', async () => {
    const userB = await createTestUser({ email: `test_s3_cb_${Date.now()}@x.com`, role: 'analyst', companyId: companyB.id, password: PASS });
    const r = await request(app)
      .patch(`/api/company/users/${userB.id}`)
      .set('Authorization', `Bearer ${cadminToken}`)
      .send({ fullName: 'Hacker' });
    expect(r.status).toBe(404);
    await testPrisma.user.deleteMany({ where: { id: userB.id } });
  });
});

// ── Activity logs ─────────────────────────────────────────────────────────────
describe('Activity logs', () => {
  it('admin sees all logs', async () => {
    const r = await request(app).get('/api/admin/activity-logs').set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data)).toBe(true);
  });

  it('company_admin sees only own company logs', async () => {
    const r = await request(app).get('/api/company/activity-logs').set('Authorization', `Bearer ${cadminToken}`);
    expect(r.status).toBe(200);
    r.body.data.forEach((log) => {
      if (log.companyId) expect(log.companyId).toBe(companyA.id);
    });
  });

  it('logs never contain secret keys', async () => {
    const r = await request(app).get('/api/admin/activity-logs').set('Authorization', `Bearer ${adminToken}`);
    const allMeta = r.body.data.map((l) => JSON.stringify(l.metadata ?? {})).join(' ');
    expect(allMeta).not.toMatch(/password|token|secret|hash/i);
  });

  it('analyst cannot access admin logs', async () => {
    const r = await request(app).get('/api/admin/activity-logs').set('Authorization', `Bearer ${analystToken}`);
    expect(r.status).toBe(403);
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────
describe('Settings', () => {
  it('admin gets all 8 settings keys', async () => {
    const r = await request(app).get('/api/admin/settings').set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(Object.keys(r.body.data).length).toBeGreaterThanOrEqual(8);
  });

  it('admin can update default_language', async () => {
    const r = await request(app)
      .patch('/api/admin/settings/default_language')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: 'fr' });
    expect(r.status).toBe(200);
    expect(r.body.data.value).toBe('fr');
    // Reset
    await request(app).patch('/api/admin/settings/default_language').set('Authorization', `Bearer ${adminToken}`).send({ value: 'ar' });
  });

  it('rejects weights that do not sum to 100', async () => {
    const r = await request(app)
      .patch('/api/admin/settings/opportunity_weights')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: { demand_growth: 10, conversion_rate: 10, leads_volume: 10, cac: 10, margin: 10 } });
    expect(r.status).toBe(400);
  });

  it('rejects invalid language code', async () => {
    const r = await request(app)
      .patch('/api/admin/settings/default_language')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: 'es' });
    expect(r.status).toBe(400);
  });

  it('public settings returns defaultLanguage + allowRegistration', async () => {
    const r = await request(app).get('/api/settings/public');
    expect(r.status).toBe(200);
    expect(r.body.data).toHaveProperty('defaultLanguage');
    expect(r.body.data).toHaveProperty('allowRegistration');
  });

  it('unknown setting key returns 404', async () => {
    const r = await request(app)
      .patch('/api/admin/settings/nonexistent_key')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: 'x' });
    expect(r.status).toBe(404);
  });
});

// ── Admin dashboard ───────────────────────────────────────────────────────────
describe('GET /api/admin/dashboard', () => {
  it('returns all required KPI fields', async () => {
    const r = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    const d = r.body.data;
    expect(typeof d.activeCompanies).toBe('number');
    expect(typeof d.pendingRequests).toBe('number');
    expect(typeof d.totalUsers).toBe('number');
    expect(typeof d.activeUsers).toBe('number');
    expect(typeof d.activeSimulations).toBe('number');
    expect(Array.isArray(d.recentActivity)).toBe(true);
    expect(Array.isArray(d.pendingRequestsPreview)).toBe(true);
  });

  it('company_admin gets 403', async () => {
    const r = await request(app).get('/api/admin/dashboard').set('Authorization', `Bearer ${cadminToken}`);
    expect(r.status).toBe(403);
  });
});

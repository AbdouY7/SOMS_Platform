// tests/integration/system2.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { testPrisma, createTestCompany, createTestUser, cleanTestDb } from '../helpers/testDb.js';

const ADMIN_PASS = 'TestPass2024!';
const PUBLIC     = '/api/public/company-requests';
const REQUESTS   = '/api/admin/requests';
const COMPANIES  = '/api/admin/companies';
const COMPANY    = '/api/company';

let adminToken;
let companyAdmin, companyAdminToken;
let testCompany;

// ── helpers ───────────────────────────────────────────────────────────────────
async function loginAs(email, password = ADMIN_PASS) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data?.accessToken;
}

async function getAdmin() {
  // Seed super admin if needed
  const email = process.env.SUPERADMIN_EMAIL;
  const pass  = process.env.SUPERADMIN_PASSWORD;
  return loginAs(email, pass);
}

beforeAll(async () => {
  adminToken = await getAdmin();
  testCompany = await createTestCompany({ name: 'Test Sys2 Company' });
  companyAdmin = await createTestUser({
    email: `test_cadmin_${Date.now()}@x.com`,
    role: 'company_admin',
    companyId: testCompany.id,
    password: ADMIN_PASS,
  });
  companyAdminToken = await loginAs(companyAdmin.email);
});

afterAll(async () => {
  await testPrisma.administrativeRequest.deleteMany({
    where: { applicantEmail: { contains: 'test_req_' } },
  });
  await cleanTestDb();
  await testPrisma.$disconnect();
});

// ── Public: submit request ────────────────────────────────────────────────────

describe('POST /api/public/company-requests', () => {
  const validPayload = () => ({
    companyName: 'Nouveaux Horizons SARL',
    registrationNumber: '99887',
    industry: 'Tech',
    contactPhone: '0555123456',
    applicantFullName: 'Karim Mansouri',
    applicantEmail: `test_req_${Date.now()}@example.com`,
    password: 'SecurePass2024!',
    confirmPassword: 'SecurePass2024!',
  });

  it('submits a valid request (201)', async () => {
    const res = await request(app).post(PUBLIC).send(validPayload());
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('rejects when passwords do not match', async () => {
    const res = await request(app).post(PUBLIC).send({
      ...validPayload(),
      confirmPassword: 'Different1234!',
    });
    expect(res.status).toBe(400);
  });

  it('rejects password shorter than 10 chars', async () => {
    const res = await request(app).post(PUBLIC).send({
      ...validPayload(),
      password: 'short',
      confirmPassword: 'short',
    });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate pending request (CONFLICT)', async () => {
    const payload = validPayload();
    await request(app).post(PUBLIC).send(payload);
    const res2 = await request(app).post(PUBLIC).send(payload);
    expect(res2.status).toBe(409);
  });

  it('rejects if email already has a user account (CONFLICT)', async () => {
    const res = await request(app).post(PUBLIC).send({
      ...validPayload(),
      applicantEmail: companyAdmin.email,
    });
    expect(res.status).toBe(409);
  });

  it('requires applicantEmail and companyName', async () => {
    const res = await request(app).post(PUBLIC).send({ password: 'abc' });
    expect(res.status).toBe(400);
  });
});

// ── Admin: list/get requests ──────────────────────────────────────────────────

describe('GET /api/admin/requests', () => {
  it('returns list of requests for super_admin', async () => {
    const res = await request(app)
      .get(REQUESTS)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
  });

  it('returns 403 for company_admin', async () => {
    const res = await request(app)
      .get(REQUESTS)
      .set('Authorization', `Bearer ${companyAdminToken}`);
    expect(res.status).toBe(403);
  });
});

// ── Admin: approve request ────────────────────────────────────────────────────

describe('PATCH /api/admin/requests/:id — approve', () => {
  it('full flow: submit → approve → login as new company_admin', async () => {
    const email = `test_req_approve_${Date.now()}@example.com`;
    const pass  = 'ApprovePass2024!';

    // 1. Submit
    await request(app).post(PUBLIC).send({
      companyName: 'Approve Test Co',
      applicantFullName: 'Test Applicant',
      applicantEmail: email,
      password: pass,
      confirmPassword: pass,
    });

    // 2. Find request
    const listRes = await request(app)
      .get(`${REQUESTS}?search=${encodeURIComponent(email)}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    const req = listRes.body.data[0];
    expect(req).toBeDefined();

    // 3. Approve
    const approveRes = await request(app)
      .patch(`${REQUESTS}/${req.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'approved' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.company).toBeDefined();

    // 4. New company_admin can log in with original password
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: pass });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.role).toBe('company_admin');

    // 5. Approving twice should fail
    const double = await request(app)
      .patch(`${REQUESTS}/${req.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'approved' });
    expect(double.status).toBe(409);

    // Cleanup
    const newUser = await testPrisma.user.findFirst({ where: { email } });
    if (newUser) {
      await testPrisma.refreshToken.deleteMany({ where: { userId: newUser.id } });
      const companyId = newUser.companyId;
      // Delete user first (company_admin CHECK requires company_id; set null before delete)
      await testPrisma.user.delete({ where: { id: newUser.id } });
      if (companyId) await testPrisma.company.delete({ where: { id: companyId } });
    }
  });

  it('reject requires a note', async () => {
    const email = `test_req_reject_${Date.now()}@example.com`;
    await request(app).post(PUBLIC).send({
      companyName: 'Reject Test Co',
      applicantFullName: 'Reject Applicant',
      applicantEmail: email,
      password: 'RejectPass2024!',
      confirmPassword: 'RejectPass2024!',
    });

    const listRes = await request(app)
      .get(`${REQUESTS}?search=${encodeURIComponent(email)}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const req = listRes.body.data[0];

    // Reject without note → 400
    const noNote = await request(app)
      .patch(`${REQUESTS}/${req.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'rejected' });
    expect(noNote.status).toBe(400);

    // Reject with note → 200
    const withNote = await request(app)
      .patch(`${REQUESTS}/${req.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'rejected', note: 'Does not meet requirements' });
    expect(withNote.status).toBe(200);
  });
});

// ── Admin: companies CRUD ─────────────────────────────────────────────────────

describe('Admin companies', () => {
  let createdId;

  it('super_admin can list companies', async () => {
    const res = await request(app)
      .get(COMPANIES)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('super_admin can create a company', async () => {
    const res = await request(app)
      .post(COMPANIES)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Created Co', industry: 'Finance' });
    expect(res.status).toBe(201);
    createdId = res.body.data.id;
  });

  it('super_admin can update a company', async () => {
    const res = await request(app)
      .patch(`${COMPANIES}/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ industry: 'Banking' });
    expect(res.status).toBe(200);
    expect(res.body.data.industry).toBe('Banking');
  });

  it('super_admin can deactivate a company', async () => {
    const res = await request(app)
      .patch(`${COMPANIES}/${createdId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'inactive' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('inactive');
  });

  it('company_admin cannot access admin companies', async () => {
    const res = await request(app)
      .get(COMPANIES)
      .set('Authorization', `Bearer ${companyAdminToken}`);
    expect(res.status).toBe(403);
  });

  it('unknown company id returns 404', async () => {
    const res = await request(app)
      .get(`${COMPANIES}/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  // Cleanup
  afterAll(async () => {
    if (createdId) {
      await testPrisma.company.delete({ where: { id: createdId } }).catch(() => {});
    }
  });
});

// ── Company admin: own profile ────────────────────────────────────────────────

describe('Company profile /api/company', () => {
  it('company_admin can read own company', async () => {
    const res = await request(app)
      .get(COMPANY)
      .set('Authorization', `Bearer ${companyAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(testCompany.id);
  });

  it('company_admin can update own company', async () => {
    const res = await request(app)
      .patch(COMPANY)
      .set('Authorization', `Bearer ${companyAdminToken}`)
      .send({ industry: 'Digital Marketing' });
    expect(res.status).toBe(200);
    expect(res.body.data.industry).toBe('Digital Marketing');
  });

  it('super_admin cannot access /api/company (no companyId)', async () => {
    const res = await request(app)
      .get(COMPANY)
      .set('Authorization', `Bearer ${adminToken}`);
    // super_admin has no company → forbidden by requireRole check
    expect(res.status).toBe(403);
  });
});

// ── Deactivated company: users cannot authenticate ───────────────────────────

describe('Deactivated company blocks logins', () => {
  it('user of inactive company gets 401 on login', async () => {
    const inactiveCompany = await createTestCompany({ name: 'Test Inactive Co', status: 'inactive' });
    const user = await createTestUser({
      email: `test_inactive_co_${Date.now()}@x.com`,
      role: 'analyst',
      companyId: inactiveCompany.id,
      password: ADMIN_PASS,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: ADMIN_PASS });
    expect(res.status).toBe(401);

    // Cleanup
    await testPrisma.user.delete({ where: { id: user.id } });
    await testPrisma.company.delete({ where: { id: inactiveCompany.id } });
  });
});

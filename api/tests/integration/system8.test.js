// tests/integration/system8.test.js
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
  companyA = await createTestCompany({ name: 'Test S8 Company Alpha' });
  companyB = await createTestCompany({ name: 'Test S8 Company Beta' });

  cadminA = await createTestUser({ email: `test_s8_cadmin_a_${Date.now()}@x.com`, role: 'company_admin', companyId: companyA.id, password: PASS });
  analystA = await createTestUser({ email: `test_s8_analyst_a_${Date.now()}@x.com`, role: 'analyst', companyId: companyA.id, password: PASS });
  viewerA = await createTestUser({ email: `test_s8_viewer_a_${Date.now()}@x.com`, role: 'viewer', companyId: companyA.id, password: PASS });
  cadminB = await createTestUser({ email: `test_s8_cadmin_b_${Date.now()}@x.com`, role: 'company_admin', companyId: companyB.id, password: PASS });

  cadminTokenA = await loginAs(cadminA.email);
  analystTokenA = await loginAs(analystA.email);
  viewerTokenA = await loginAs(viewerA.email);
  cadminTokenB = await loginAs(cadminB.email);

  // Mock Flask microservice analyticsClient for forecast
  vi.spyOn(analyticsClient, 'post').mockImplementation(async (url, body) => {
    if (url === '/compute/forecast') {
      const K = body.K || 10000;
      const duration = body.durationDays || 30;
      const r = body.r || 0.2;
      const t0 = body.t0 || 15;
      const budget = body.budget;

      const series = [];
      for (let d = 0; d <= duration; d++) {
        const val = K / (1 + Math.exp(-r * (d - t0)));
        const daily = d === 0 ? val : val * 0.05;
        series.push({
          day: d,
          date: `2026-06-${String(d + 1).padStart(2, '0')}`,
          cumulative: Math.round(val),
          daily: Math.round(daily),
          stochasticMin: Math.round(val * 0.9),
          stochasticMax: Math.round(val * 1.1),
        });
      }

      return {
        data: {
          series,
          milestones: {
            p10: { day: Math.round(t0 - 8.8 / r), target: K * 0.1, reached: true },
            p50: { day: t0, target: K * 0.5, reached: true },
            p90: { day: Math.round(t0 + 8.8 / r), target: K * 0.9, reached: true },
          },
          summary: {
            finalValue: Math.round(K * 0.95),
            pctOfK: 95.0,
            costPerResult: budget ? Math.round((budget / (K * 0.95)) * 100) / 100 : null,
            budget,
            durationDays: duration,
            targetAudience: body.targetAudience,
            K,
            r,
            t0,
          },
          warnings: [],
        },
      };
    }

    if (url === '/compute/forecast/fit') {
      return {
        data: {
          K: 12000,
          r: 0.25,
          t0: 14.5,
          rmse: 2.15,
          warnings: [],
        },
      };
    }

    throw new Error(`Unexpected endpoint call ${url}`);
  });
});

describe('System 8: Forecast & S-Curve Simulation', () => {
  const validAssumptions = {
    targetAudience: 50000,
    K: 20000,
    r: 0.25,
    t0: 15,
    durationDays: 30,
    startDate: '2026-06-01',
    budget: 100000,
  };

  it('rejects live simulation without auth (401)', async () => {
    const res = await request(app)
      .post('/api/forecast/simulate')
      .send(validAssumptions);
    expect(res.status).toBe(401);
  });

  it('rejects live simulation for viewer role (403)', async () => {
    const res = await request(app)
      .post('/api/forecast/simulate')
      .set('Authorization', `Bearer ${viewerTokenA}`)
      .send(validAssumptions);
    expect(res.status).toBe(403);
  });

  it('validates assumptions schema on simulate (rejects K > audience, duration 0, negative r)', async () => {
    // K > audience
    let res = await request(app)
      .post('/api/forecast/simulate')
      .set('Authorization', `Bearer ${analystTokenA}`)
      .send({ ...validAssumptions, K: 60000, targetAudience: 50000 });
    expect(res.status).toBe(400);

    // duration 0
    res = await request(app)
      .post('/api/forecast/simulate')
      .set('Authorization', `Bearer ${analystTokenA}`)
      .send({ ...validAssumptions, durationDays: 0 });
    expect(res.status).toBe(400);

    // negative r
    res = await request(app)
      .post('/api/forecast/simulate')
      .set('Authorization', `Bearer ${analystTokenA}`)
      .send({ ...validAssumptions, r: -0.1 });
    expect(res.status).toBe(400);
  });

  it('returns live simulation preview without persisting to database', async () => {
    const beforeCount = await testPrisma.campaignSimulation.count({
      where: { companyId: companyA.id },
    });

    const res = await request(app)
      .post('/api/forecast/simulate')
      .set('Authorization', `Bearer ${analystTokenA}`)
      .send(validAssumptions);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.series).toBeDefined();
    expect(res.body.data.milestones).toBeDefined();
    expect(res.body.data.summary.K).toBe(20000);

    const afterCount = await testPrisma.campaignSimulation.count({
      where: { companyId: companyA.id },
    });
    expect(afterCount).toBe(beforeCount);
  });

  let createdSimA1, createdSimA2;

  it('saves a simulation scenario (analyst, 201) and logs activity', async () => {
    const res = await request(app)
      .post('/api/forecast/simulations')
      .set('Authorization', `Bearer ${analystTokenA}`)
      .send({
        name: 'Massiliya Ramadan Launch',
        assumptions: validAssumptions,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    createdSimA1 = res.body.data;
    expect(createdSimA1.name).toBe('Massiliya Ramadan Launch');
    expect(createdSimA1.companyId).toBe(companyA.id);
    expect(createdSimA1.scenarioJson).toBeDefined();

    // Verify activity log
    const log = await testPrisma.activityLog.findFirst({
      where: { companyId: companyA.id, action: 'simulation.created' },
    });
    expect(log).toBeDefined();
    expect(log.entityId).toBe(createdSimA1.id);
  });

  it('saves a second scenario for comparison (cadmin, 201)', async () => {
    const res = await request(app)
      .post('/api/forecast/simulations')
      .set('Authorization', `Bearer ${cadminTokenA}`)
      .send({
        name: 'Conservative Summer Campaign',
        assumptions: {
          ...validAssumptions,
          K: 10000,
          r: 0.15,
          t0: 20,
          budget: 50000,
        },
      });

    expect(res.status).toBe(201);
    createdSimA2 = res.body.data;
  });

  it('lists simulations for company A (including viewer)', async () => {
    const res = await request(app)
      .get('/api/forecast/simulations')
      .set('Authorization', `Bearer ${viewerTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data.map((s) => s.name)).toContain('Massiliya Ramadan Launch');
  });

  it('enforces tenant isolation on list (Company B sees 0 simulations)', async () => {
    const res = await request(app)
      .get('/api/forecast/simulations')
      .set('Authorization', `Bearer ${cadminTokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it('gets simulation by ID for company A', async () => {
    const res = await request(app)
      .get(`/api/forecast/simulations/${createdSimA1.id}`)
      .set('Authorization', `Bearer ${viewerTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdSimA1.id);
  });

  it('enforces tenant isolation on GET by ID (Company B gets 404)', async () => {
    const res = await request(app)
      .get(`/api/forecast/simulations/${createdSimA1.id}`)
      .set('Authorization', `Bearer ${cadminTokenB}`);

    expect(res.status).toBe(404);
  });

  it('updates simulation name and recomputes if assumptions provided', async () => {
    const res = await request(app)
      .patch(`/api/forecast/simulations/${createdSimA1.id}`)
      .set('Authorization', `Bearer ${analystTokenA}`)
      .send({
        name: 'Massiliya Ramadan Launch v2',
        assumptions: {
          ...validAssumptions,
          budget: 120000,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Massiliya Ramadan Launch v2');
    expect(Number(res.body.data.budget)).toBe(120000);
  });

  it('enforces tenant isolation on PATCH (Company B gets 404)', async () => {
    const res = await request(app)
      .patch(`/api/forecast/simulations/${createdSimA1.id}`)
      .set('Authorization', `Bearer ${cadminTokenB}`)
      .send({ name: 'Hacked name' });

    expect(res.status).toBe(404);
  });

  it('compares 2 scenarios: returns aligned series and comparison table', async () => {
    const res = await request(app)
      .post('/api/forecast/compare')
      .set('Authorization', `Bearer ${viewerTokenA}`)
      .send({ ids: [createdSimA1.id, createdSimA2.id] });

    expect(res.status).toBe(200);
    expect(res.body.data.simulations.length).toBe(2);
    expect(res.body.data.alignedSeries.length).toBeGreaterThan(0);
    expect(res.body.data.summaryTable.length).toBe(2);
  });

  it('enforces tenant isolation on compare (rejects if any ID belongs to another company -> 404)', async () => {
    const res = await request(app)
      .post('/api/forecast/compare')
      .set('Authorization', `Bearer ${cadminTokenB}`)
      .send({ ids: [createdSimA1.id, createdSimA2.id] });

    expect(res.status).toBe(404);
  });

  it('calibrates curve parameters via POST /api/forecast/calibrate', async () => {
    const observed = [
      { day: 2, value: 500 },
      { day: 5, value: 1500 },
      { day: 10, value: 5000 },
      { day: 15, value: 8500 },
      { day: 20, value: 11000 },
    ];

    const res = await request(app)
      .post('/api/forecast/calibrate')
      .set('Authorization', `Bearer ${analystTokenA}`)
      .send({ observed, initialK: 12000 });

    expect(res.status).toBe(200);
    expect(res.body.data.K).toBe(12000);
    expect(res.body.data.r).toBe(0.25);
  });

  it('archives simulation (soft delete)', async () => {
    const res = await request(app)
      .delete(`/api/forecast/simulations/${createdSimA2.id}`)
      .set('Authorization', `Bearer ${cadminTokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isArchived).toBe(true);

    // Verify it is excluded from default list
    const listRes = await request(app)
      .get('/api/forecast/simulations')
      .set('Authorization', `Bearer ${cadminTokenA}`);

    expect(listRes.body.data.length).toBe(1);
    expect(listRes.body.data[0].id).toBe(createdSimA1.id);
  });

  it('reflects active simulations in Admin Dashboard KPI', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    // createdSimA1 is active, createdSimA2 is archived
    expect(res.body.data.activeSimulations).toBeGreaterThanOrEqual(1);
  });
});


// src/modules/forecast/forecast.service.js
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma.js';
import { AppError } from '../../utils/AppError.js';
import { analyticsClient } from '../../services/analyticsClient.js';
import { logger } from '../../utils/logger.js';

export const forecastService = {
  /**
   * Calls Flask /compute/forecast for live simulation without saving.
   */
  async simulate(assumptions) {
    try {
      const payload = {
        targetAudience: assumptions.targetAudience,
        K: assumptions.K,
        r: assumptions.r,
        t0: assumptions.t0,
        durationDays: assumptions.durationDays,
        startDate: assumptions.startDate,
        budget: assumptions.budget ?? null,
        volatility: assumptions.volatility ?? 30.0,
      };

      const res = await analyticsClient.post('/compute/forecast', payload);
      return res.data;
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error({ err }, 'Failed to compute forecast simulation');
      throw new AppError('Failed to compute forecast simulation', 500, 'INTERNAL_ERROR');
    }
  },

  /**
   * Save a simulation scenario (recomputed server-side, never trusts client series).
   */
  async saveSimulation({ companyId, userId, name, assumptions }) {
    // 1. Recompute server-side
    const scenario = await this.simulate(assumptions);

    // 2. Persist in database
    const simulation = await prisma.campaignSimulation.create({
      data: {
        companyId,
        name,
        budget: assumptions.budget !== undefined && assumptions.budget !== null
          ? new Prisma.Decimal(assumptions.budget)
          : null,
        startDate: new Date(assumptions.startDate),
        durationDays: assumptions.durationDays,
        assumptionsJson: assumptions,
        scenarioJson: scenario,
        isArchived: false,
        createdBy: userId,
      },
    });

    // 3. Log activity
    await prisma.activityLog.create({
      data: {
        actorUserId: userId,
        companyId,
        action: 'simulation.created',
        entityType: 'campaign_simulation',
        entityId: simulation.id,
        metadata: { name, assumptions: { K: assumptions.K, r: assumptions.r, t0: assumptions.t0 } },
      },
    }).catch((logErr) => logger.warn({ err: logErr }, 'Failed to write simulation.created log'));

    return simulation;
  },

  /**
   * List non-archived simulations for company.
   */
  async listSimulations({ companyId, includeArchived = false }) {
    const where = { companyId };
    if (!includeArchived) {
      where.isArchived = false;
    }

    return prisma.campaignSimulation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        budget: true,
        startDate: true,
        durationDays: true,
        assumptionsJson: true,
        scenarioJson: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  },

  /**
   * Get single simulation by ID with strict tenant boundary.
   */
  async getSimulation({ companyId, id }) {
    const simulation = await prisma.campaignSimulation.findFirst({
      where: { id, companyId },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!simulation) {
      throw AppError.notFound('Simulation not found');
    }

    return simulation;
  },

  /**
   * Update name or assumptions (recomputes scenario if assumptions change).
   */
  async updateSimulation({ companyId, userId, id, name, assumptions }) {
    const existing = await prisma.campaignSimulation.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw AppError.notFound('Simulation not found');
    }

    const updateData = {};
    if (name !== undefined) {
      updateData.name = name;
    }

    if (assumptions) {
      const scenario = await this.simulate(assumptions);
      updateData.assumptionsJson = assumptions;
      updateData.scenarioJson = scenario;
      updateData.budget = assumptions.budget !== undefined && assumptions.budget !== null
        ? new Prisma.Decimal(assumptions.budget)
        : null;
      updateData.startDate = new Date(assumptions.startDate);
      updateData.durationDays = assumptions.durationDays;
    }

    const updated = await prisma.campaignSimulation.update({
      where: { id },
      data: updateData,
    });

    // Log update
    await prisma.activityLog.create({
      data: {
        actorUserId: userId,
        companyId,
        action: 'simulation.updated',
        entityType: 'campaign_simulation',
        entityId: id,
        metadata: { name: updated.name, assumptionsUpdated: !!assumptions },
      },
    }).catch((logErr) => logger.warn({ err: logErr }, 'Failed to write simulation.updated log'));

    return updated;
  },

  /**
   * Soft delete / archive simulation.
   */
  async archiveSimulation({ companyId, userId, id }) {
    const existing = await prisma.campaignSimulation.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw AppError.notFound('Simulation not found');
    }

    const updated = await prisma.campaignSimulation.update({
      where: { id },
      data: { isArchived: true },
    });

    // Log archive
    await prisma.activityLog.create({
      data: {
        actorUserId: userId,
        companyId,
        action: 'simulation.archived',
        entityType: 'campaign_simulation',
        entityId: id,
        metadata: { name: existing.name },
      },
    }).catch((logErr) => logger.warn({ err: logErr }, 'Failed to write simulation.archived log'));

    return updated;
  },

  /**
   * Compare 2-4 scenarios: aligns time series and generates comparative summary.
   */
  async compareSimulations({ companyId, ids }) {
    const simulations = await prisma.campaignSimulation.findMany({
      where: {
        id: { in: ids },
        companyId,
        isArchived: false,
      },
    });

    if (simulations.length !== ids.length) {
      throw AppError.notFound('One or more simulations not found or do not belong to this company');
    }

    // Determine max duration across all scenarios
    const maxDuration = Math.max(...simulations.map((s) => s.durationDays));

    // Align series by day index 0..maxDuration
    const alignedSeries = [];
    for (let day = 0; day <= maxDuration; day++) {
      const row = { day };
      for (const sim of simulations) {
        const scenario = sim.scenarioJson;
        const pt = scenario.series?.find((s) => s.day === day);
        row[`sim_${sim.id}_cum`] = pt ? pt.cumulative : (scenario.series?.[scenario.series.length - 1]?.cumulative ?? 0);
        row[`sim_${sim.id}_daily`] = pt ? pt.daily : 0;
      }
      alignedSeries.push(row);
    }

    // Build summary comparison table
    const summaryTable = simulations.map((sim) => {
      const scenario = sim.scenarioJson || {};
      const summary = scenario.summary || {};
      const milestones = scenario.milestones || {};
      const assumptions = sim.assumptionsJson || {};

      return {
        id: sim.id,
        name: sim.name,
        targetAudience: assumptions.targetAudience,
        K: assumptions.K,
        r: assumptions.r,
        t0: assumptions.t0,
        durationDays: sim.durationDays,
        budget: sim.budget ? Number(sim.budget) : null,
        finalReach: summary.finalValue,
        pctOfCapacity: summary.pctOfK,
        daysToP10: milestones.p10?.day ?? null,
        daysToP50: milestones.p50?.day ?? null,
        daysToP90: milestones.p90?.day ?? null,
        costPerResult: summary.costPerResult,
        warningCount: scenario.warnings?.length || 0,
      };
    });

    return {
      simulations: simulations.map((s) => ({
        id: s.id,
        name: s.name,
        budget: s.budget ? Number(s.budget) : null,
        durationDays: s.durationDays,
        startDate: s.startDate,
        assumptions: s.assumptionsJson,
      })),
      alignedSeries,
      summaryTable,
    };
  },

  /**
   * Optional curve calibration via Flask curve_fit.
   */
  async calibrateCurve({ observed, initialK }) {
    try {
      const res = await analyticsClient.post('/compute/forecast/fit', {
        observed,
        initialK: initialK ?? null,
      });
      return res.data;
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error({ err }, 'Failed to calibrate curve parameters');
      throw new AppError('Failed to calibrate curve parameters', 500, 'INTERNAL_ERROR');
    }
  },
};


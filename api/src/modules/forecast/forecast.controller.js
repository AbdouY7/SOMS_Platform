// src/modules/forecast/forecast.controller.js
import { ok } from '../../utils/apiResponse.js';
import { forecastService } from './forecast.service.js';

export async function simulateForecast(req, res, next) {
  try {
    const assumptions = req.validatedBody || req.body;
    const result = await forecastService.simulate(assumptions);
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function saveSimulation(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const { name, assumptions } = req.body;

    const simulation = await forecastService.saveSimulation({
      companyId,
      userId,
      name,
      assumptions,
    });

    return ok(res, simulation, undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function listSimulations(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const includeArchived = req.query.includeArchived === 'true';

    const list = await forecastService.listSimulations({
      companyId,
      includeArchived,
    });

    return ok(res, list);
  } catch (err) {
    next(err);
  }
}

export async function getSimulation(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const simulation = await forecastService.getSimulation({ companyId, id });
    return ok(res, simulation);
  } catch (err) {
    next(err);
  }
}

export async function updateSimulation(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const { id } = req.params;
    const { name, assumptions } = req.validatedBody || req.body;

    const updated = await forecastService.updateSimulation({
      companyId,
      userId,
      id,
      name,
      assumptions,
    });

    return ok(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function archiveSimulation(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const { id } = req.params;

    const archived = await forecastService.archiveSimulation({ companyId, userId, id });
    return ok(res, { success: true, id: archived.id, isArchived: true });
  } catch (err) {
    next(err);
  }
}

export async function compareSimulations(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { ids } = req.validatedBody || req.body;

    const comparison = await forecastService.compareSimulations({ companyId, ids });
    return ok(res, comparison);
  } catch (err) {
    next(err);
  }
}

export async function calibrateCurve(req, res, next) {
  try {
    const { observed, initialK } = req.validatedBody || req.body;
    const result = await forecastService.calibrateCurve({ observed, initialK });
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

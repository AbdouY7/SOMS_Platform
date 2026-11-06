// src/modules/growth/growth.controller.js
import { ok } from '../../utils/apiResponse.js';
import { growthService } from './growth.service.js';

export async function getGrowthSummary(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const query = req.validatedQuery || req.query;

    const data = await growthService.summary({
      companyId,
      start: query.start,
      end: query.end,
      granularity: query.granularity,
      metric: query.metric,
      dataMode: query.dataMode,
    });

    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getGrowthOpportunities(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const query = req.validatedQuery || req.query;

    const data = await growthService.opportunities({
      companyId,
      start: query.start,
      end: query.end,
      dataMode: query.dataMode,
      weights: query.weights,
    });

    return ok(res, data);
  } catch (err) {
    next(err);
  }
}


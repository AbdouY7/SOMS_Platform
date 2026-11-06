// src/modules/scheduler/scheduler.controller.js
import { ok } from '../../utils/apiResponse.js';
import { schedulerService } from './scheduler.service.js';

export async function getSchedulerAnalysis(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const query = req.validatedQuery || req.query;

    const data = await schedulerService.analysis({
      companyId,
      platform: query.platform,
      start: query.start,
      end: query.end,
      contentType: query.contentType,
      dataMode: query.dataMode,
      metric: query.metric,
    });

    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

export async function listScheduledItems(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const query = req.validatedQuery || req.query;

    const items = await schedulerService.listItems({
      companyId,
      start: query.start,
      end: query.end,
      platform: query.platform,
      status: query.status,
    });

    return ok(res, items);
  } catch (err) {
    next(err);
  }
}

export async function createScheduledItem(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const body = req.body;

    const item = await schedulerService.createItem({
      companyId,
      userId,
      data: body,
    });

    return ok(res, item, undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateScheduledItem(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const body = req.body;

    const item = await schedulerService.updateItem({
      companyId,
      id,
      data: body,
    });

    return ok(res, item);
  } catch (err) {
    next(err);
  }
}

export async function deleteScheduledItem(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const result = await schedulerService.deleteItem({
      companyId,
      id,
    });

    return ok(res, result);
  } catch (err) {
    next(err);
  }
}


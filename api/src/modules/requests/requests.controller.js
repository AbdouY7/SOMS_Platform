// src/modules/requests/requests.controller.js
import { ok } from '../../utils/apiResponse.js';
import * as requestsService from './requests.service.js';

export async function submit(req, res, next) {
  try {
    const result = await requestsService.submit(req.body);
    return ok(res, result, undefined, 201);
  } catch (err) { next(err); }
}

export async function listRequests(req, res, next) {
  try {
    const { items, meta } = await requestsService.list(req.query);
    return ok(res, items, meta);
  } catch (err) { next(err); }
}

export async function getRequest(req, res, next) {
  try {
    const req_ = await requestsService.getById(req.params.id);
    return ok(res, req_);
  } catch (err) { next(err); }
}

export async function decideRequest(req, res, next) {
  try {
    const result = await requestsService.decide(
      req.params.id,
      req.user.id,
      req.body.decision,
      req.body.note
    );
    return ok(res, result);
  } catch (err) { next(err); }
}

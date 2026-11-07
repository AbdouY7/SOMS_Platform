// src/modules/hub/hub.controller.js
import { ok } from '../../utils/apiResponse.js';
import { hubService } from './hub.service.js';

export async function getHubSummary(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const dataMode = req.query.dataMode === 'demo' ? 'demo' : 'real';

    const summary = await hubService.getSummary({ companyId, dataMode });
    return ok(res, summary);
  } catch (err) {
    next(err);
  }
}

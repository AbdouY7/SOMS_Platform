// src/modules/admin/dashboard.controller.js
import { ok } from '../../utils/apiResponse.js';
import { statsService } from '../../services/stats.js';

export async function getAdminDashboard(req, res, next) {
  try {
    const data = await statsService.getAdminDashboard();
    return ok(res, data);
  } catch (err) { next(err); }
}

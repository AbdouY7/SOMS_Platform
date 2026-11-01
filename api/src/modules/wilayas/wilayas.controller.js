// src/modules/wilayas/wilayas.controller.js
import { ok } from '../../utils/response.js';
import { asyncHandler } from '../../utils/http.js';
import { wilayaList } from '../../services/wilaya.js';

// GET /api/wilayas
export const list = asyncHandler(async (_req, res) => {
  ok(res, await wilayaList());
});

// src/modules/geo/geo.controller.js
import { ok } from '../../utils/response.js';
import { AppError } from '../../utils/AppError.js';
import { asyncHandler, parseRequest } from '../../utils/http.js';
import { geoMetricsQuerySchema, wilayaDetailSchema, geoCompareQuerySchema } from './geo.schema.js';
import { geoService } from './geo.service.js';

function companyOf(req) {
  if (!req.user?.companyId) {
    throw new AppError('This action needs a company account', 403, 'COMPANY_REQUIRED');
  }
  return req.user.companyId;
}

// GET /api/analytics/geo
export const getGeo = asyncHandler(async (req, res) => {
  const { query } = parseRequest(geoMetricsQuerySchema, req);
  ok(res, await geoService.getGeoMetrics(companyOf(req), query));
});

// GET /api/analytics/geo/compare
export const compare = asyncHandler(async (req, res) => {
  const { query } = parseRequest(geoCompareQuerySchema, req);
  ok(res, await geoService.compareWilayas(companyOf(req), query.codes, query));
});

// GET /api/analytics/geo/:wilayaCode
export const getDetail = asyncHandler(async (req, res) => {
  const { params, query } = parseRequest(wilayaDetailSchema, req);
  ok(res, await geoService.getWilayaDetail(companyOf(req), params.wilayaCode, query));
});


// src/modules/imports/imports.controller.js
import { z } from 'zod';
import { ok } from '../../utils/response.js';
import { AppError } from '../../utils/AppError.js';
import { asyncHandler, parseRequest } from '../../utils/http.js';
import { buildTemplate } from '../../services/template.js';
import { IMPORT_TYPES } from '../../services/csvValidate.js';
import { importsService } from './imports.service.js';

const typeEnum = z.enum(IMPORT_TYPES);
const modeEnum = z.enum(['append', 'upsert']);
const onErrorEnum = z.enum(['skip_invalid', 'abort']);
const uuid = z.string().uuid();

const previewSchema = z.object({
  body: z.object({
    type: typeEnum,
    mode: modeEnum.default('append'),
    onError: onErrorEnum.default('skip_invalid'),
  }),
});
const idSchema = z.object({ params: z.object({ id: uuid }) });
const commitSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({ mode: modeEnum.optional(), onError: onErrorEnum.optional() }).default({}),
});
const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
const templateSchema = z.object({ params: z.object({ type: typeEnum }) });

/** Imports are company data: a super_admin without a company cannot use them. */
function companyOf(req) {
  if (!req.user?.companyId) throw new AppError('This action needs a company account', 403, 'COMPANY_REQUIRED');
  return req.user.companyId;
}

const sendCsv = (res, filename, csv) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};

export const list = asyncHandler(async (req, res) => {
  const { query } = parseRequest(listSchema, req);
  ok(res, await importsService.list(companyOf(req), query));
});

export const preview = asyncHandler(async (req, res) => {
  const { body } = parseRequest(previewSchema, req);
  ok(res, await importsService.preview(req.file, body.type, body.mode, body.onError, req.user.id, companyOf(req)), undefined, 201);
});

export const commit = asyncHandler(async (req, res) => {
  const { params, body } = parseRequest(commitSchema, req);
  ok(res, await importsService.commit(params.id, companyOf(req), req.user.id, body));
});

export const rollback = asyncHandler(async (req, res) => {
  const { params } = parseRequest(idSchema, req);
  ok(res, await importsService.rollback(params.id, companyOf(req), req.user.id));
});

export const detail = asyncHandler(async (req, res) => {
  const { params } = parseRequest(idSchema, req);
  ok(res, await importsService.getDetail(params.id, companyOf(req)));
});

export const errorsCsv = asyncHandler(async (req, res) => {
  const { params } = parseRequest(idSchema, req);
  sendCsv(res, `import-${params.id}-errors.csv`, await importsService.buildErrorCsv(params.id, companyOf(req)));
});

export const template = asyncHandler(async (req, res) => {
  const { params } = parseRequest(templateSchema, req);
  sendCsv(res, `${params.type}-template.csv`, buildTemplate(params.type));
});

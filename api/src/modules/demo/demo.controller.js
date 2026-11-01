// src/modules/demo/demo.controller.js
import { z } from 'zod';
import { ok } from '../../utils/response.js';
import { AppError } from '../../utils/AppError.js';
import { prisma } from '../../prisma.js';
import { asyncHandler, parseRequest } from '../../utils/http.js';
import { demoService } from '../../services/demo.js';

const schema = z.object({ params: z.object({ companyId: z.string().uuid() }) });

async function activeCompany(companyId) {
  const company = await prisma.company.findFirst({ where: { id: companyId, status: 'active' }, select: { id: true } });
  if (!company) throw new AppError('Active company not found', 404, 'COMPANY_NOT_FOUND');
}

// POST /api/admin/demo-data/:companyId/seed
export const seed = asyncHandler(async (req, res) => {
  const { params } = parseRequest(schema, req);
  await activeCompany(params.companyId);
  ok(res, await demoService.seed(params.companyId, req.user.id));
});

// POST /api/admin/demo-data/:companyId/purge
export const purge = asyncHandler(async (req, res) => {
  const { params } = parseRequest(schema, req);
  await activeCompany(params.companyId);
  ok(res, await demoService.purge(params.companyId, req.user.id));
});

// src/modules/reports/reports.controller.js
import { ok } from '../../utils/apiResponse.js';
import { reportsService } from './reports.service.js';

export async function createReport(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const { type, title, start, end, filters, dataMode } = req.body;

    const report = await reportsService.generate({
      companyId,
      userId,
      type,
      title,
      start,
      end,
      filters,
      dataMode,
    });

    return ok(res, report, undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function listReports(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { type, dataMode, page, limit } = req.query;

    const result = await reportsService.listReports({
      companyId,
      type,
      dataMode,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });

    return ok(res, result.reports, result.pagination);
  } catch (err) {
    next(err);
  }
}

export async function getReport(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const report = await reportsService.getReport({ companyId, id });
    return ok(res, report);
  } catch (err) {
    next(err);
  }
}

export async function exportCsv(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const report = await reportsService.getReport({ companyId, id });
    const csv = reportsService.buildCsv(report);

    const safeTitle = (report.title || 'report')
      .replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_')
      .slice(0, 40);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="soms-${safeTitle}-${id.slice(0, 8)}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}

export async function deleteReport(req, res, next) {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.id;
    const { id } = req.params;

    const result = await reportsService.deleteReport({ companyId, userId, id });
    return ok(res, result);
  } catch (err) {
    next(err);
  }
}

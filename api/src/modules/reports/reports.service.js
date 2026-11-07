// src/modules/reports/reports.service.js
import { prisma } from '../../prisma.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import { geoService } from '../geo/geo.service.js';
import { growthService } from '../growth/growth.service.js';
import { schedulerService } from '../scheduler/scheduler.service.js';
import { forecastService } from '../forecast/forecast.service.js';

const REAL_SOURCES = ['public_manual', 'csv_import', 'official_api'];
const DEMO_SOURCES = ['synthetic_demo'];

/**
 * Escapes a cell value for CSV output:
 * 1. Formula injection protection: prefixes =, +, -, @ with an apostrophe
 * 2. Standard RFC 4180 quotes wrapping if comma, newline, or quote exists
 */
function escapeCsvCell(val) {
  if (val === null || val === undefined) return '';
  let str = String(val);

  // Security guard against CSV injection in Excel/Calc
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  if (/[",\r\n]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const reportsService = {
  /**
   * Generates a frozen, reproducible report snapshot across one or more modules.
   */
  async generate({ companyId, userId, type, title, start, end, filters = {}, dataMode = 'real' }) {
    const sourceTypes = dataMode === 'demo' ? DEMO_SOURCES : REAL_SOURCES;
    const snapshot = {};

    // 1. Fetch module data depending on report type
    if (type === 'geo' || type === 'combined') {
      try {
        snapshot.geo = await geoService.getGeoMetrics({
          companyId,
          start,
          end,
          platform: filters.platform,
          dataMode,
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to compile geo section for report');
        snapshot.geo = { error: 'Failed to generate geo section', wilayas: [] };
      }
    }

    if (type === 'growth' || type === 'combined') {
      try {
        snapshot.growth = await growthService.summary({
          companyId,
          start,
          end,
          granularity: filters.granularity || 'month',
          metric: filters.metric || 'orders',
          dataMode,
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to compile growth section for report');
        snapshot.growth = { error: 'Failed to generate growth section', kpis: {}, timeline: [] };
      }
    }

    if (type === 'scheduler' || type === 'combined') {
      try {
        snapshot.scheduler = await schedulerService.analysis({
          companyId,
          platform: filters.platform || 'instagram',
          start,
          end,
          contentType: filters.contentType,
          dataMode,
          metric: filters.metric || 'auto',
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to compile scheduler section for report');
        snapshot.scheduler = { error: 'Failed to generate scheduler section', windows: [] };
      }
    }

    if (type === 'forecast' || type === 'combined') {
      try {
        const sims = await forecastService.listSimulations({ companyId, includeArchived: false });
        snapshot.forecast = { simulations: sims };
      } catch (err) {
        logger.warn({ err }, 'Failed to compile forecast section for report');
        snapshot.forecast = { error: 'Failed to generate forecast section', simulations: [] };
      }
    }

    // 2. Count sources feeding this report
    const [postsCount, salesCount, metricsCount, simsCount] = await Promise.all([
      prisma.socialPost.count({ where: { companyId, sourceType: { in: sourceTypes } } }),
      prisma.salesRecord.count({ where: { companyId, sourceType: { in: sourceTypes } } }),
      prisma.regionalMetric.count({ where: { companyId, sourceType: { in: sourceTypes } } }),
      prisma.campaignSimulation.count({ where: { companyId, isArchived: false } }),
    ]);

    const sources = {
      dataMode,
      socialPostsCount: postsCount,
      salesRecordsCount: salesCount,
      regionalMetricsCount: metricsCount,
      activeSimulationsCount: simsCount,
      capturedAt: new Date().toISOString(),
    };

    // 3. Persist frozen report
    const report = await prisma.report.create({
      data: {
        companyId,
        createdBy: userId,
        reportType: type,
        title,
        periodStart: start ? new Date(start) : null,
        periodEnd: end ? new Date(end) : null,
        filtersJson: filters,
        dataMode,
        snapshotJson: snapshot,
        sourcesJson: sources,
      },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    // 4. Log activity
    await prisma.activityLog.create({
      data: {
        actorUserId: userId,
        companyId,
        action: 'report.created',
        entityType: 'report',
        entityId: report.id,
        metadata: { title, reportType: type, dataMode },
      },
    }).catch((logErr) => logger.warn({ err: logErr }, 'Failed to write report.created log'));

    return report;
  },

  /**
   * List reports for company with pagination & optional filtering.
   */
  async listReports({ companyId, type, dataMode, page = 1, limit = 20 }) {
    const where = { companyId };
    if (type) where.reportType = type;
    if (dataMode) where.dataMode = dataMode;

    const skip = (page - 1) * limit;

    const [total, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          reportType: true,
          title: true,
          periodStart: true,
          periodEnd: true,
          dataMode: true,
          createdAt: true,
          sourcesJson: true,
          creator: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
    ]);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Retrieve single frozen report with strict tenant isolation.
   */
  async getReport({ companyId, id }) {
    const report = await prisma.report.findFirst({
      where: { id, companyId },
      include: {
        creator: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!report) {
      throw AppError.notFound('Report not found');
    }

    return report;
  },

  /**
   * Delete report.
   */
  async deleteReport({ companyId, userId, id }) {
    const existing = await prisma.report.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw AppError.notFound('Report not found');
    }

    await prisma.report.delete({ where: { id } });

    // Log deletion
    await prisma.activityLog.create({
      data: {
        actorUserId: userId,
        companyId,
        action: 'report.deleted',
        entityType: 'report',
        entityId: id,
        metadata: { title: existing.title, reportType: existing.reportType },
      },
    }).catch((logErr) => logger.warn({ err: logErr }, 'Failed to write report.deleted log'));

    return { id, success: true };
  },

  /**
   * Builds an Arabic-safe CSV string with UTF-8 BOM and formula injection protection.
   */
  buildCsv(report) {
    const lines = [];

    // 1. Metadata Header Block
    lines.push(`# SOMS Analytics Report`);
    lines.push(`# Title: ${escapeCsvCell(report.title)}`);
    lines.push(`# Report Type: ${escapeCsvCell(report.reportType)}`);
    lines.push(`# Data Mode: ${report.dataMode.toUpperCase()}`);
    lines.push(
      `# Period: ${report.periodStart ? report.periodStart.toISOString().slice(0, 10) : 'N/A'} to ${
        report.periodEnd ? report.periodEnd.toISOString().slice(0, 10) : 'N/A'
      }`
    );
    lines.push(`# Generated At: ${report.createdAt.toISOString()}`);
    lines.push(`# Creator: ${report.creator?.fullName || 'System'}`);
    lines.push('');

    const snapshot = report.snapshotJson || {};

    // 2. Geo Section
    if (snapshot.geo?.wilayas && Array.isArray(snapshot.geo.wilayas)) {
      lines.push('### GEO ANALYTICS BY WILAYA');
      lines.push('Wilaya Code,Wilaya Name,Wilaya Name AR,Total Revenue (DZD),Total Orders,AOV (DZD),Spend (DZD)');
      for (const w of snapshot.geo.wilayas) {
        lines.push(
          [
            escapeCsvCell(w.code),
            escapeCsvCell(w.name),
            escapeCsvCell(w.nameAr || ''),
            escapeCsvCell(w.revenue ?? 0),
            escapeCsvCell(w.orders ?? 0),
            escapeCsvCell(w.aov ?? 0),
            escapeCsvCell(w.spend ?? 0),
          ].join(',')
        );
      }
      lines.push('');
    }

    // 3. Growth Section
    if (snapshot.growth?.timeline && Array.isArray(snapshot.growth.timeline)) {
      lines.push('### GROWTH & SALES TIMELINE');
      lines.push('Period,Current Sales (DZD),Current Orders,Previous Sales (DZD),Previous Orders,Sales Growth (%),Orders Growth (%)');
      for (const p of snapshot.growth.timeline) {
        lines.push(
          [
            escapeCsvCell(p.period),
            escapeCsvCell(p.sales ?? 0),
            escapeCsvCell(p.orders ?? 0),
            escapeCsvCell(p.prevSales ?? 0),
            escapeCsvCell(p.prevOrders ?? 0),
            escapeCsvCell(p.salesGrowthPct !== null ? `${p.salesGrowthPct}%` : 'N/A'),
            escapeCsvCell(p.ordersGrowthPct !== null ? `${p.ordersGrowthPct}%` : 'N/A'),
          ].join(',')
        );
      }
      lines.push('');
    }

    // 4. Scheduler Section
    if (snapshot.scheduler?.windows && Array.isArray(snapshot.scheduler.windows)) {
      lines.push('### OPTIMAL PUBLISHING WINDOWS');
      lines.push('Day,Start Hour,End Hour,Confidence,Avg Engagement,Peak Score');
      for (const w of snapshot.scheduler.windows) {
        lines.push(
          [
            escapeCsvCell(w.dayName || w.day),
            escapeCsvCell(w.startHour),
            escapeCsvCell(w.endHour),
            escapeCsvCell(w.confidence || 'medium'),
            escapeCsvCell(w.avgEngagement ?? 0),
            escapeCsvCell(w.score ?? 0),
          ].join(',')
        );
      }
      lines.push('');
    }

    // 5. Forecast Section
    if (snapshot.forecast?.simulations && Array.isArray(snapshot.forecast.simulations)) {
      lines.push('### DIFFUSION FORECAST SCENARIOS');
      lines.push('Scenario Name,Capacity (K),Growth Rate (r),Inflection Day (t0),Duration (Days),Budget (DZD),Final Reach,CPR (DZD)');
      for (const s of snapshot.forecast.simulations) {
        const assumptions = s.assumptionsJson || {};
        const summary = s.scenarioJson?.summary || {};
        lines.push(
          [
            escapeCsvCell(s.name),
            escapeCsvCell(assumptions.K ?? '—'),
            escapeCsvCell(assumptions.r ?? '—'),
            escapeCsvCell(assumptions.t0 ?? '—'),
            escapeCsvCell(s.durationDays),
            escapeCsvCell(s.budget ?? '—'),
            escapeCsvCell(summary.finalValue ?? '—'),
            escapeCsvCell(summary.costPerResult ?? '—'),
          ].join(',')
        );
      }
      lines.push('');
    }

    // UTF-8 BOM (\uFEFF) ensures Excel properly detects Arabic and UTF-8 characters
    return '\uFEFF' + lines.join('\r\n');
  },
};

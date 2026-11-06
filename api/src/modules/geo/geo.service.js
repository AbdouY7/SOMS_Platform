// src/modules/geo/geo.service.js
import { prisma } from '../../prisma.js';
import { AppError } from '../../utils/AppError.js';
import { divideSafe } from '../../utils/divideSafe.js';
import { wilayaList } from '../../services/wilaya.js';

const REAL_SOURCES = ['public_manual', 'csv_import', 'official_api'];
const DEMO_SOURCES = ['synthetic_demo'];

function resolveDateRange(startStr, endStr) {
  const end = endStr ? new Date(`${endStr}T23:59:59.999Z`) : new Date();
  const start = startStr
    ? new Date(`${startStr}T00:00:00.000Z`)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw AppError.validation('Invalid start or end date format');
  }
  if (start > end) {
    throw AppError.validation('start date must be before or equal to end date');
  }

  return { start, end };
}

function getPreviousPeriod(start, end) {
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return { prevStart, prevEnd };
}

function sourceFilter(dataMode) {
  return dataMode === 'demo' ? { in: DEMO_SOURCES } : { in: REAL_SOURCES };
}

/**
 * Fetch and aggregate raw metric numbers per wilaya for a given date window.
 */
async function fetchWilayaAggregates(companyId, start, end, sources) {
  const startDateOnly = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endDateOnly = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  // 1. regional_metrics
  const regionalMetrics = await prisma.regionalMetric.findMany({
    where: {
      companyId,
      sourceType: sources,
      periodStart: { lte: endDateOnly },
      periodEnd: { gte: startDateOnly },
    },
    select: {
      wilayaCode: true,
      metricType: true,
      metricValue: true,
      sourceType: true,
    },
  });

  // 2. sales_records (with wilaya_code)
  const salesRecords = await prisma.salesRecord.findMany({
    where: {
      companyId,
      sourceType: sources,
      wilayaCode: { not: null },
      orderDate: { gte: startDateOnly, lte: endDateOnly },
    },
    select: {
      wilayaCode: true,
      orderCount: true,
      revenue: true,
      acquisitionCost: true,
      sourceType: true,
    },
  });

  const aggregates = new Map();

  function getEntry(code) {
    if (!aggregates.has(code)) {
      aggregates.set(code, {
        impressions: null,
        clicks: null,
        conversions: null,
        spend: null,
        orders: null,
        revenue: null,
        followers: null,
        profit_margin: null,
        hasData: false,
      });
    }
    return aggregates.get(code);
  }

  // Aggregate regional metrics
  for (const row of regionalMetrics) {
    const entry = getEntry(row.wilayaCode);
    entry.hasData = true;
    const val = Number(row.metricValue);
    if (!isNaN(val)) {
      entry[row.metricType] = (entry[row.metricType] ?? 0) + val;
    }
  }

  // Aggregate sales records
  for (const row of salesRecords) {
    if (!row.wilayaCode) continue;
    const entry = getEntry(row.wilayaCode);
    entry.hasData = true;
    const orders = Number(row.orderCount) || 0;
    const rev = Number(row.revenue) || 0;
    const acq = row.acquisitionCost !== null ? Number(row.acquisitionCost) : null;

    entry.orders = (entry.orders ?? 0) + orders;
    entry.revenue = (entry.revenue ?? 0) + rev;
    if (acq !== null) {
      entry.spend = (entry.spend ?? 0) + acq;
    }
  }

  return aggregates;
}

/**
 * Compute the requested metric (direct or derived) for a wilaya's aggregated values.
 */
function computeMetricValue(entry, metric) {
  if (!entry || !entry.hasData) return null;

  switch (metric) {
    case 'impressions':
    case 'clicks':
    case 'conversions':
    case 'spend':
    case 'orders':
    case 'revenue':
    case 'followers':
    case 'profit_margin':
      return entry[metric] !== undefined ? entry[metric] : null;

    case 'conversion_rate': {
      // conversions / clicks * 100 via divideSafe
      const rate = divideSafe(entry.conversions, entry.clicks);
      return rate !== null ? Number((rate * 100).toFixed(2)) : null;
    }

    case 'cost_per_conversion': {
      // spend / conversions via divideSafe
      const cpc = divideSafe(entry.spend, entry.conversions);
      return cpc !== null ? Number(cpc.toFixed(2)) : null;
    }

    case 'average_order_value': {
      // revenue / orders via divideSafe
      const aov = divideSafe(entry.revenue, entry.orders);
      return aov !== null ? Number(aov.toFixed(2)) : null;
    }

    default:
      return null;
  }
}

/**
 * Rank only wilayas with a non-null value. Ties share the same rank.
 */
function wilayasRank(items, metric) {
  const isLowerBetter = metric === 'cost_per_conversion';
  const valid = items.filter((item) => item.value !== null);

  valid.sort((a, b) => (isLowerBetter ? a.value - b.value : b.value - a.value));

  let currentRank = 1;
  for (let i = 0; i < valid.length; i += 1) {
    if (i > 0 && valid[i].value === valid[i - 1].value) {
      valid[i].rank = valid[i - 1].rank;
    } else {
      valid[i].rank = currentRank;
    }
    currentRank += 1;
  }

  const rankMap = new Map(valid.map((v) => [v.code, v.rank]));
  for (const item of items) {
    item.rank = rankMap.get(item.code) ?? null;
  }
}

// ── GET /api/analytics/geo ────────────────────────────────────────────────────
export async function getGeoMetrics(companyId, query = {}) {
  const { start, end } = resolveDateRange(query.start, query.end);
  const metric = query.metric || 'revenue';
  const dataMode = query.dataMode || 'real';
  const compare = query.compare === true || query.compare === 'true';

  const sources = sourceFilter(dataMode);
  const wilayas = await wilayaList();

  const currentAgg = await fetchWilayaAggregates(companyId, start, end, sources);

  let prevAgg = null;
  if (compare) {
    const { prevStart, prevEnd } = getPreviousPeriod(start, end);
    prevAgg = await fetchWilayaAggregates(companyId, prevStart, prevEnd, sources);
  }

  const items = [];
  const missing = [];

  for (const w of wilayas) {
    const currEntry = currentAgg.get(w.code);
    const value = computeMetricValue(currEntry, metric);

    let previous = null;
    let changePct = null;

    if (compare && prevAgg) {
      const prevEntry = prevAgg.get(w.code);
      previous = computeMetricValue(prevEntry, metric);
      if (value !== null && previous !== null && previous > 0) {
        changePct = Number((((value - previous) / previous) * 100).toFixed(2));
      }
    }

    if (value === null) {
      missing.push(w.code);
    }

    items.push({
      code: w.code,
      nameAr: w.nameAr,
      nameFr: w.nameFr,
      nameEn: w.nameEn,
      value,
      previous,
      changePct,
      rank: null,
    });
  }

  wilayasRank(items, metric);

  // Source counts & lastUpdated
  const [metricCounts, salesCounts, latestMetric, latestSale] = await Promise.all([
    prisma.regionalMetric.groupBy({
      by: ['sourceType'],
      where: { companyId, sourceType: sources },
      _count: true,
    }),
    prisma.salesRecord.groupBy({
      by: ['sourceType'],
      where: { companyId, sourceType: sources },
      _count: true,
    }),
    prisma.regionalMetric.findFirst({
      where: { companyId, sourceType: sources },
      orderBy: { id: 'desc' },
      select: { periodEnd: true },
    }),
    prisma.salesRecord.findFirst({
      where: { companyId, sourceType: sources },
      orderBy: { orderDate: 'desc' },
      select: { orderDate: true },
    }),
  ]);

  const sourceMap = {};
  for (const c of [...metricCounts, ...salesCounts]) {
    sourceMap[c.sourceType] = (sourceMap[c.sourceType] ?? 0) + c._count;
  }

  const lastUpdated = latestSale?.orderDate || latestMetric?.periodEnd || null;

  const warnings = [];
  if (items.every((it) => it.value === null)) {
    warnings.push('No regional metrics found for this period. Try selecting another date range or import data.');
  }

  return {
    wilayas: items,
    missing,
    sources: sourceMap,
    lastUpdated: lastUpdated ? new Date(lastUpdated).toISOString() : null,
    warnings,
    metric,
    period: {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    },
  };
}

// ── GET /api/analytics/geo/:wilayaCode ─────────────────────────────────────────
export async function getWilayaDetail(companyId, wilayaCode, query = {}) {
  const { start, end } = resolveDateRange(query.start, query.end);
  const dataMode = query.dataMode || 'real';
  const sources = sourceFilter(dataMode);

  const wilayas = await wilayaList();
  const wilaya = wilayas.find((w) => w.code === wilayaCode);
  if (!wilaya) {
    throw AppError.notFound(`Wilaya ${wilayaCode} not found`);
  }

  const aggregates = await fetchWilayaAggregates(companyId, start, end, sources);
  const entry = aggregates.get(wilayaCode);

  const directMetrics = {
    impressions: entry?.impressions ?? null,
    clicks: entry?.clicks ?? null,
    conversions: entry?.conversions ?? null,
    spend: entry?.spend ?? null,
    orders: entry?.orders ?? null,
    revenue: entry?.revenue ?? null,
    followers: entry?.followers ?? null,
    profit_margin: entry?.profit_margin ?? null,
  };

  const derivedMetrics = {
    conversion_rate: computeMetricValue(entry, 'conversion_rate'),
    cost_per_conversion: computeMetricValue(entry, 'cost_per_conversion'),
    average_order_value: computeMetricValue(entry, 'average_order_value'),
  };

  // Monthly trend series
  const startDateOnly = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endDateOnly = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  const monthlySales = await prisma.salesRecord.groupBy({
    by: ['orderDate'],
    where: {
      companyId,
      wilayaCode,
      sourceType: sources,
      orderDate: { gte: startDateOnly, lte: endDateOnly },
    },
    _sum: { orderCount: true, revenue: true },
    orderBy: { orderDate: 'asc' },
  });

  const trends = monthlySales.map((s) => ({
    date: s.orderDate.toISOString().slice(0, 10),
    orders: s._sum.orderCount ?? 0,
    revenue: Number(s._sum.revenue ?? 0),
  }));

  return {
    wilaya: {
      code: wilaya.code,
      nameAr: wilaya.nameAr,
      nameFr: wilaya.nameFr,
      nameEn: wilaya.nameEn,
    },
    metrics: directMetrics,
    derived: derivedMetrics,
    trends,
    hasData: entry?.hasData ?? false,
    period: {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    },
  };
}

// ── GET /api/analytics/geo/compare ───────────────────────────────────────────
export async function compareWilayas(companyId, codesStr, query = {}) {
  const codes = (codesStr || '')
    .split(',')
    .map((c) => c.trim().padStart(2, '0'))
    .filter(Boolean);

  if (codes.length < 2 || codes.length > 4) {
    throw AppError.validation('Comparison requires between 2 and 4 wilaya codes');
  }

  const { start, end } = resolveDateRange(query.start, query.end);
  const dataMode = query.dataMode || 'real';
  const sources = sourceFilter(dataMode);

  const wilayas = await wilayaList();
  const aggregates = await fetchWilayaAggregates(companyId, start, end, sources);

  const comparison = codes.map((code) => {
    const w = wilayas.find((item) => item.code === code);
    if (!w) throw AppError.notFound(`Wilaya with code ${code} not found`);

    const entry = aggregates.get(code);

    return {
      code: w.code,
      nameAr: w.nameAr,
      nameFr: w.nameFr,
      nameEn: w.nameEn,
      hasData: entry?.hasData ?? false,
      metrics: {
        impressions: entry?.impressions ?? null,
        clicks: entry?.clicks ?? null,
        conversions: entry?.conversions ?? null,
        spend: entry?.spend ?? null,
        orders: entry?.orders ?? null,
        revenue: entry?.revenue ?? null,
        followers: entry?.followers ?? null,
      },
      derived: {
        conversion_rate: computeMetricValue(entry, 'conversion_rate'),
        cost_per_conversion: computeMetricValue(entry, 'cost_per_conversion'),
        average_order_value: computeMetricValue(entry, 'average_order_value'),
      },
    };
  });

  return {
    comparison,
    period: {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    },
  };
}

export const geoService = {
  getGeoMetrics,
  getWilayaDetail,
  compareWilayas,
};


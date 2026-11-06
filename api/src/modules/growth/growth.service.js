// src/modules/growth/growth.service.js
import { prisma } from '../../prisma.js';
import { AppError } from '../../utils/AppError.js';
import { divideSafe } from '../../utils/divideSafe.js';
import { settingsService } from '../../services/settings.js';
import { analyticsClient } from '../../services/analyticsClient.js';
import { wilayaList } from '../../services/wilaya.js';

const REAL_SOURCES = ['public_manual', 'csv_import', 'official_api'];
const DEMO_SOURCES = ['synthetic_demo'];

export function growthCalculate(current, previous) {
  const cur = Number(current) || 0;
  const prev = Number(previous) || 0;

  if (prev === 0 && cur === 0) {
    return { value: null, state: 'no_activity' };
  }
  if (prev === 0 && cur !== 0) {
    return { value: null, state: 'new' };
  }

  const val = ((cur - prev) / Math.abs(prev)) * 100;
  return {
    value: Math.round(val * 100) / 100,
    state: 'normal',
  };
}

function resolveDateRange(startStr, endStr) {
  const end = endStr ? new Date(`${endStr}T23:59:59.999Z`) : new Date();
  const start = startStr
    ? new Date(`${startStr}T00:00:00.000Z`)
    : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);

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

function getBucketKey(date, granularity) {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');

  if (granularity === 'day') {
    return `${year}-${month}-${day}`;
  }
  if (granularity === 'month') {
    return `${year}-${month}`;
  }
  // Week format: YYYY-Www
  const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
  const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
  const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

export const growthService = {
  /**
   * Summary KPI cards and timeline series for sales/orders/revenue growth.
   */
  async summary({ companyId, start: startStr, end: endStr, granularity = 'month', metric = 'orders', dataMode = 'real' }) {
    const { start, end } = resolveDateRange(startStr, endStr);
    const { prevStart, prevEnd } = getPreviousPeriod(start, end);
    const sourceTypes = dataMode === 'demo' ? DEMO_SOURCES : REAL_SOURCES;

    // Fetch sales records across previous and current periods
    const salesRecords = await prisma.salesRecord.findMany({
      where: {
        companyId,
        sourceType: { in: sourceTypes },
        orderDate: { gte: prevStart, lte: end },
      },
      orderBy: { orderDate: 'asc' },
    });

    // Also fetch public posts if metric is followers or reach
    const socialPosts = await prisma.socialPost.findMany({
      where: {
        companyId,
        sourceType: { in: sourceTypes },
        publishedAt: { gte: prevStart, lte: end },
      },
      orderBy: { publishedAt: 'asc' },
    });

    // Bucket records
    const currentBuckets = new Map();
    const prevBuckets = new Map();

    let curSales = 0;
    let curOrders = 0;
    let prevSales = 0;
    let prevOrders = 0;

    for (const record of salesRecords) {
      const d = record.orderDate;
      const isCur = d >= start && d <= end;
      const isPrev = d >= prevStart && d <= prevEnd;
      const rev = Number(record.revenue) || 0;
      const cnt = Number(record.orderCount) || 0;

      if (isCur) {
        curSales += rev;
        curOrders += cnt;
        const bKey = getBucketKey(d, granularity);
        const b = currentBuckets.get(bKey) || { period: bKey, orders: 0, revenue: 0, followers: 0 };
        b.orders += cnt;
        b.revenue += rev;
        currentBuckets.set(bKey, b);
      } else if (isPrev) {
        prevSales += rev;
        prevOrders += cnt;
        const bKey = getBucketKey(d, granularity);
        const b = prevBuckets.get(bKey) || { period: bKey, orders: 0, revenue: 0, followers: 0 };
        b.orders += cnt;
        b.revenue += rev;
        prevBuckets.set(bKey, b);
      }
    }

    for (const post of socialPosts) {
      const d = post.publishedAt;
      const isCur = d >= start && d <= end;
      const isPrev = d >= prevStart && d <= prevEnd;
      const bKey = getBucketKey(d, granularity);

      if (isCur) {
        const b = currentBuckets.get(bKey) || { period: bKey, orders: 0, revenue: 0, followers: 0 };
        b.followers += post.likes || 0; // proxy interaction count
        currentBuckets.set(bKey, b);
      } else if (isPrev) {
        const b = prevBuckets.get(bKey) || { period: bKey, orders: 0, revenue: 0, followers: 0 };
        b.followers += post.likes || 0;
        prevBuckets.set(bKey, b);
      }
    }

    const currentSeries = Array.from(currentBuckets.values()).sort((a, b) => a.period.localeCompare(b.period));
    const previousSeries = Array.from(prevBuckets.values()).sort((a, b) => a.period.localeCompare(b.period));

    const curAov = divideSafe(curSales, curOrders);
    const prevAov = divideSafe(prevSales, prevOrders);

    const salesGrowth = growthCalculate(curSales, prevSales);
    const ordersGrowth = growthCalculate(curOrders, prevOrders);
    const aovGrowth = curAov !== null && prevAov !== null ? growthCalculate(curAov, prevAov) : { value: null, state: 'no_activity' };

    const minPeriodsRequired = (await settingsService.get('growth_min_periods')) || 3;
    const periodsAvailable = currentSeries.length;

    const warnings = [];
    if (periodsAvailable < minPeriodsRequired) {
      warnings.push(`Only ${periodsAvailable} period(s) available; recommended minimum is ${minPeriodsRequired} periods for reliable trend analysis.`);
    }

    return {
      dateFrom: start.toISOString(),
      dateTo: end.toISOString(),
      previousDateFrom: prevStart.toISOString(),
      previousDateTo: prevEnd.toISOString(),
      granularity,
      metric,
      dataMode,
      totals: {
        sales: curSales,
        orders: curOrders,
        aov: curAov,
        salesGrowth,
        ordersGrowth,
        aovGrowth,
      },
      previousTotals: {
        sales: prevSales,
        orders: prevOrders,
        aov: prevAov,
      },
      series: currentSeries,
      previousSeries,
      periodsAvailable,
      minPeriodsRequired,
      warnings,
      sources: {
        salesRecordsCount: salesRecords.length,
        socialPostsCount: socialPosts.length,
      },
    };
  },

  /**
   * Ranked wilaya opportunity scoring via Flask microservice.
   */
  async opportunities({ companyId, start: startStr, end: endStr, dataMode = 'real', weights }) {
    const { start, end } = resolveDateRange(startStr, endStr);
    const { prevStart, prevEnd } = getPreviousPeriod(start, end);
    const sourceTypes = dataMode === 'demo' ? DEMO_SOURCES : REAL_SOURCES;

    // Load wilaya metadata map
    const allWilayas = await wilayaList();
    const wilayaMetaMap = new Map();
    allWilayas.forEach((w) => wilayaMetaMap.set(w.code, w));

    // 1. Regional metrics in current period
    const curRegionalMetrics = await prisma.regionalMetric.findMany({
      where: {
        companyId,
        sourceType: { in: sourceTypes },
        periodStart: { lte: end },
        periodEnd: { gte: start },
      },
    });

    // 2. Sales records in current period
    const curSalesRecords = await prisma.salesRecord.findMany({
      where: {
        companyId,
        sourceType: { in: sourceTypes },
        orderDate: { gte: start, lte: end },
      },
    });

    // 3. Sales records in previous period (for demandGrowth)
    const prevSalesRecords = await prisma.salesRecord.findMany({
      where: {
        companyId,
        sourceType: { in: sourceTypes },
        orderDate: { gte: prevStart, lte: prevEnd },
      },
    });

    // Group current data per wilaya
    const wilayaData = new Map();
    allWilayas.forEach((w) => {
      wilayaData.set(w.code, {
        code: w.code,
        curOrders: 0,
        prevOrders: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        marginSum: 0,
        marginCount: 0,
        hasData: false,
      });
    });

    for (const r of curRegionalMetrics) {
      if (r.wilayaCode && wilayaData.has(r.wilayaCode)) {
        const item = wilayaData.get(r.wilayaCode);
        item.hasData = true;
        const val = Number(r.metricValue) || 0;
        if (r.metricType === 'clicks') item.clicks += val;
        if (r.metricType === 'conversions') item.conversions += val;
        if (r.metricType === 'spend') item.spend += val;
        if (r.metricType === 'profit_margin') {
          item.marginSum += val;
          item.marginCount += 1;
        }
      }
    }

    for (const s of curSalesRecords) {
      if (s.wilayaCode && wilayaData.has(s.wilayaCode)) {
        const item = wilayaData.get(s.wilayaCode);
        item.hasData = true;
        item.curOrders += Number(s.orderCount) || 0;
      }
    }

    for (const s of prevSalesRecords) {
      if (s.wilayaCode && wilayaData.has(s.wilayaCode)) {
        const item = wilayaData.get(s.wilayaCode);
        item.prevOrders += Number(s.orderCount) || 0;
      }
    }

    // Build features for Flask
    const items = [];
    for (const [code, d] of wilayaData.entries()) {
      // Calculate demandGrowth
      let demandGrowth = null;
      if (d.curOrders > 0 || d.prevOrders > 0) {
        if (d.prevOrders === 0) {
          demandGrowth = 100.0; // new demand
        } else {
          demandGrowth = Math.round((((d.curOrders - d.prevOrders) / d.prevOrders) * 100) * 100) / 100;
        }
      }

      // Conversion rate
      const conversionRate = divideSafe(d.conversions, d.clicks);

      // Leads volume
      const leadsVolume = d.clicks > 0 ? d.clicks : (d.conversions > 0 ? d.conversions * 10 : null);

      // CAC
      const cac = divideSafe(d.spend, d.conversions);

      // Profit margin
      const margin = d.marginCount > 0 ? d.marginSum / d.marginCount : null;

      // Only pass items that have at least one valid feature
      if (demandGrowth !== null || conversionRate !== null || leadsVolume !== null || cac !== null || margin !== null) {
        items.push({
          wilayaCode: code,
          features: {
            demandGrowth,
            conversionRate,
            leadsVolume,
            cac,
            margin,
          },
        });
      }
    }

    // Default weights from settings if not supplied in query
    let weightsPayload = weights;
    if (!weightsPayload) {
      const dbWeights = await settingsService.get('opportunity_weights');
      if (dbWeights) {
        weightsPayload = {
          demandGrowth: dbWeights.demand_growth ?? 30,
          conversionRate: dbWeights.conversion_rate ?? 25,
          leadsVolume: dbWeights.leads_volume ?? 20,
          cac: dbWeights.cac ?? 15,
          margin: dbWeights.margin ?? 10,
        };
      }
    }

    // Call Flask compute service
    const flaskRes = await analyticsClient.post('/compute/opportunity-score', {
      items,
      weights: weightsPayload,
    });

    const flaskResults = flaskRes.data?.results || [];

    // Enhance results with localized wilaya names and ranks
    let rank = 1;
    const rankedResults = flaskResults.map((r) => {
      const meta = wilayaMetaMap.get(r.wilayaCode);
      const isScored = r.score !== null;
      const currentRank = isScored ? rank++ : null;

      return {
        ...r,
        rank: currentRank,
        nameAr: meta?.nameAr || r.wilayaCode,
        nameFr: meta?.nameFr || r.wilayaCode,
        nameEn: meta?.nameEn || r.wilayaCode,
      };
    });

    return {
      dateFrom: start.toISOString(),
      dateTo: end.toISOString(),
      dataMode,
      weightsUsed: weightsPayload,
      results: rankedResults,
      totalWilayasEvaluated: rankedResults.length,
      disclaimer: 'Opportunity scores are based exclusively on your company uploaded data, not on the broader Algerian macroeconomic market.',
    };
  },
};

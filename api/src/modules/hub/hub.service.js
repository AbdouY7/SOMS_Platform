// src/modules/hub/hub.service.js
import { prisma } from '../../prisma.js';

const REAL_SOURCES = ['public_manual', 'csv_import', 'official_api'];
const DEMO_SOURCES = ['synthetic_demo'];

export const hubService = {
  /**
   * Fast, aggregated summary for the company landing hub.
   * Cheap count/sum queries only per spec.
   */
  async getSummary({ companyId, dataMode = 'real' }) {
    const sourceTypes = dataMode === 'demo' ? DEMO_SOURCES : REAL_SOURCES;

    // 1. Parallel counts and aggregates
    const [
      postAgg,
      salesAgg,
      regionalCount,
      scheduledCount,
      simulationsCount,
      reportsCount,
      latestImports,
      recentReports,
    ] = await Promise.all([
      // Social posts aggregate
      prisma.socialPost.aggregate({
        where: { companyId, sourceType: { in: sourceTypes } },
        _count: { id: true },
        _sum: {
          impressions: true,
          reach: true,
          likes: true,
          comments: true,
          shares: true,
          clicks: true,
          views: true,
        },
      }),

      // Sales records aggregate
      prisma.salesRecord.aggregate({
        where: { companyId, sourceType: { in: sourceTypes } },
        _count: { id: true },
        _sum: {
          orderCount: true,
          revenue: true,
          acquisitionCost: true,
        },
      }),

      // Regional metrics count
      prisma.regionalMetric.count({
        where: { companyId, sourceType: { in: sourceTypes } },
      }),

      // Scheduled items count
      prisma.scheduledItem.count({
        where: { companyId },
      }),

      // Active simulations count
      prisma.campaignSimulation.count({
        where: { companyId, isArchived: false },
      }),

      // Reports count
      prisma.report.count({
        where: { companyId, dataMode },
      }),

      // Latest 5 data imports
      prisma.dataImport.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          fileName: true,
          importType: true,
          status: true,
          totalRows: true,
          acceptedRows: true,
          createdAt: true,
        },
      }),

      // Recent 5 reports
      prisma.report.findMany({
        where: { companyId, dataMode },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          reportType: true,
          dataMode: true,
          periodStart: true,
          periodEnd: true,
          createdAt: true,
        },
      }),
    ]);

    const postCount = postAgg._count.id || 0;
    const salesCount = salesAgg._count.id || 0;
    const totalRevenue = salesAgg._sum.revenue ? Number(salesAgg._sum.revenue) : 0;
    const totalOrders = salesAgg._sum.orderCount ? Number(salesAgg._sum.orderCount) : 0;
    const totalSpend = salesAgg._sum.acquisitionCost ? Number(salesAgg._sum.acquisitionCost) : 0;
    const totalImpressions = postAgg._sum.impressions || 0;
    const totalReach = postAgg._sum.reach || 0;
    const totalEngagement =
      (postAgg._sum.likes || 0) +
      (postAgg._sum.comments || 0) +
      (postAgg._sum.shares || 0);

    // 2. Data notices & quality checks
    const notices = [];
    if (postCount === 0 && salesCount === 0) {
      notices.push({
        id: 'no_data',
        type: 'warning',
        message: 'No data imported yet. Import your first CSV to unlock analytics modules.',
      });
    } else {
      if (postCount === 0) {
        notices.push({
          id: 'no_posts',
          type: 'info',
          message: 'No social posts found. Scheduler & post heatmaps require social post imports.',
        });
      }
      if (salesCount === 0) {
        notices.push({
          id: 'no_sales',
          type: 'info',
          message: 'No sales records found. Growth tracking and regional revenue require sales imports.',
        });
      }
    }

    if (dataMode === 'demo') {
      notices.push({
        id: 'demo_active',
        type: 'info',
        message: 'Viewing synthetic demo dataset for evaluation.',
      });
    }

    return {
      kpiSummary: {
        totalPosts: postCount,
        totalSalesRecords: salesCount,
        totalRevenue,
        totalOrders,
        totalSpend,
        totalImpressions,
        totalReach,
        totalEngagement,
      },
      moduleStatus: {
        geo: {
          hasData: regionalCount > 0 || salesCount > 0,
          regionalCount,
          salesCount,
        },
        growth: {
          hasData: salesCount > 0,
          salesCount,
        },
        scheduler: {
          hasData: postCount > 0,
          postsCount: postCount,
          scheduledCount,
        },
        forecast: {
          hasData: simulationsCount > 0,
          simulationsCount,
        },
        reports: {
          hasData: reportsCount > 0,
          reportsCount,
        },
      },
      latestImports,
      recentReports,
      notices,
    };
  },
};

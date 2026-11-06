// src/modules/scheduler/scheduler.service.js
import { prisma } from '../../prisma.js';
import { AppError } from '../../utils/AppError.js';
import { settingsService } from '../../services/settings.js';
import { analyticsClient } from '../../services/analyticsClient.js';

const REAL_SOURCES = ['public_manual', 'csv_import', 'official_api'];
const DEMO_SOURCES = ['synthetic_demo'];

export const schedulerService = {
  /**
   * Heatmap & optimal posting window analysis via Flask compute microservice.
   */
  async analysis({ companyId, platform, start: startStr, end: endStr, contentType, dataMode = 'real', metric = 'auto' }) {
    const sourceTypes = dataMode === 'demo' ? DEMO_SOURCES : REAL_SOURCES;

    const where = {
      companyId,
      platform,
      sourceType: { in: sourceTypes },
    };

    if (contentType) {
      where.contentType = contentType;
    }

    if (startStr || endStr) {
      where.publishedAt = {};
      if (startStr) where.publishedAt.gte = new Date(startStr);
      if (endStr) where.publishedAt.lte = new Date(endStr);
    }

    const posts = await prisma.socialPost.findMany({
      where,
      select: {
        id: true,
        publishedAt: true,
        likes: true,
        comments: true,
        shares: true,
        views: true,
        reach: true,
        impressions: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: 20000,
    });

    const minSamplesPerSlot = (await settingsService.get('scheduler_min_posts_per_slot')) || 5;
    const minTotalPosts = (await settingsService.get('scheduler_min_total_posts')) || 30;

    // Call Flask compute service
    const flaskRes = await analyticsClient.post('/compute/scheduler', {
      posts: posts.map((p) => ({
        publishedAt: p.publishedAt.toISOString(),
        likes: p.likes ?? 0,
        comments: p.comments ?? 0,
        shares: p.shares ?? 0,
        views: p.views ?? 0,
        reach: p.reach ?? 0,
        impressions: p.impressions ?? 0,
      })),
      metric,
      minSamplesPerSlot,
      minTotalPosts,
      timezone: 'Africa/Algiers',
    });

    const computeData = flaskRes.data || {};

    return {
      platform,
      dataMode,
      metricUsed: computeData.metricUsed || (metric === 'auto' ? 'engagement_rate' : metric),
      sample: computeData.sample || {
        totalPosts: posts.length,
        usablePosts: posts.length,
        minRequired: minTotalPosts,
        minSamplesPerSlot,
      },
      cells: computeData.cells || [],
      ranking: computeData.ranking || [],
      recommendations: computeData.recommendations || [],
      warnings: computeData.warnings || [],
    };
  },

  /**
   * List scheduled items for internal plan.
   */
  async listItems({ companyId, start, end, platform, status }) {
    const where = { companyId };

    if (platform) where.platform = platform;
    if (status) where.status = status;

    if (start || end) {
      where.plannedAt = {};
      if (start) where.plannedAt.gte = new Date(start);
      if (end) where.plannedAt.lte = new Date(end);
    }

    return prisma.scheduledItem.findMany({
      where,
      include: {
        creator: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { plannedAt: 'asc' },
    });
  },

  /**
   * Create planned post item.
   */
  async createItem({ companyId, userId, data }) {
    return prisma.scheduledItem.create({
      data: {
        companyId,
        platform: data.platform,
        plannedAt: new Date(data.plannedAt),
        title: data.title,
        contentType: data.contentType || null,
        notes: data.notes || null,
        status: data.status || 'planned',
        createdBy: userId,
      },
    });
  },

  /**
   * Update planned item with tenant verification.
   */
  async updateItem({ companyId, id, data }) {
    const existing = await prisma.scheduledItem.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      throw AppError.notFound('Scheduled item not found');
    }

    const updateData = {};
    if (data.platform !== undefined) updateData.platform = data.platform;
    if (data.plannedAt !== undefined) updateData.plannedAt = new Date(data.plannedAt);
    if (data.title !== undefined) updateData.title = data.title;
    if (data.contentType !== undefined) updateData.contentType = data.contentType;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status;

    return prisma.scheduledItem.update({
      where: { id },
      data: updateData,
    });
  },

  /**
   * Delete planned item with tenant verification.
   */
  async deleteItem({ companyId, id }) {
    const existing = await prisma.scheduledItem.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      throw AppError.notFound('Scheduled item not found');
    }

    await prisma.scheduledItem.delete({
      where: { id },
    });
    return { success: true };
  },
};


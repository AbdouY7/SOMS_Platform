// src/modules/posts/posts.service.js
// Manual social posts. Every query is scoped by companyId; a foreign id is a 404.
import { prisma } from '../../prisma.js';
import { AppError } from '../../utils/AppError.js';
import { record } from '../../services/activity.js';

async function findScoped(id, companyId) {
  const post = await prisma.socialPost.findFirst({ where: { id, companyId } });
  if (!post) throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
  return post;
}

/** Unique (company, platform, external id) violation -> friendly 409. */
function rethrowConflict(err) {
  if (err?.code === 'P2002') {
    throw new AppError('A post with this platform and external post ID already exists', 409, 'POST_DUPLICATE');
  }
  throw err;
}

export async function list(filters = {}, companyId) {
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 20, 100);

  const where = { companyId };
  if (filters.platform) where.platform = filters.platform;
  if (filters.dateFrom || filters.dateTo) {
    where.publishedAt = {};
    if (filters.dateFrom) where.publishedAt.gte = new Date(`${filters.dateFrom}T00:00:00.000Z`);
    if (filters.dateTo) where.publishedAt.lte = new Date(`${filters.dateTo}T23:59:59.999Z`);
  }

  const [items, total] = await Promise.all([
    prisma.socialPost.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.socialPost.count({ where }),
  ]);

  return { items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

export async function create(data, companyId, actorId) {
  try {
    const post = await prisma.socialPost.create({
      data: { ...data, companyId, sourceType: 'public_manual', createdBy: actorId },
    });
    await record({
      actorUserId: actorId, companyId, action: 'post.created', entityType: 'SocialPost', entityId: post.id,
      metadata: { platform: post.platform },
    });
    return post;
  } catch (err) {
    return rethrowConflict(err);
  }
}

export async function update(id, data, companyId, actorId = null) {
  await findScoped(id, companyId);
  try {
    const post = await prisma.socialPost.update({ where: { id }, data });
    await record({
      actorUserId: actorId, companyId, action: 'post.updated', entityType: 'SocialPost', entityId: id,
      metadata: { fields: Object.keys(data) },
    });
    return post;
  } catch (err) {
    return rethrowConflict(err);
  }
}

export async function remove(id, companyId, actorId = null) {
  await findScoped(id, companyId);
  await prisma.socialPost.delete({ where: { id } });
  await record({ actorUserId: actorId, companyId, action: 'post.deleted', entityType: 'SocialPost', entityId: id });
  return { id };
}

export const postsService = { list, create, update, remove };

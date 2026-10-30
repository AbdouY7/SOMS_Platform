// src/services/stats.js
// Aggregated numbers for the admin dashboard — counts and groupBy only, no per-row loops.
import { prisma } from '../prisma.js';

export async function getAdminDashboard() {
  const [activeCompanies, pendingRequests, userGroups, recentActivity, pendingRequestsPreview] =
    await Promise.all([
      prisma.company.count({ where: { status: 'active' } }),
      prisma.administrativeRequest.count({ where: { status: 'pending' } }),
      prisma.user.groupBy({ by: ['isActive'], _count: { _all: true } }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          actor: { select: { id: true, fullName: true, email: true } },
          company: { select: { id: true, name: true } },
        },
      }),
      prisma.administrativeRequest.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, companyName: true, applicantFullName: true, applicantEmail: true, createdAt: true },
      }),
    ]);

  const activeUsers = userGroups.find((g) => g.isActive)?._count._all ?? 0;
  const inactiveUsers = userGroups.find((g) => !g.isActive)?._count._all ?? 0;

  return {
    activeCompanies,
    pendingRequests,
    totalUsers: activeUsers + inactiveUsers,
    activeUsers,
    activeSimulations: 0, // 0 until System 8
    recentActivity,
    pendingRequestsPreview,
  };
}

export const statsService = { getAdminDashboard };

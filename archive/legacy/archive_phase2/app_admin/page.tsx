// ═══════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════
// Dashboard for administrators with firm-wide statistics

import { requireRole } from '@/lib/auth';
import { Role } from '@/lib/constants';
import { db } from '@/lib/db';
import { StatCard } from '@/components/dashboard/stat-card';
import { RecentJobs } from '@/components/dashboard/recent-jobs';
import { logger } from '@/lib/logger';
import { Job } from '@prisma/client';

export default async function AdminDashboard() {
  await requireRole([Role.ADMIN]);

  // Fetch statistics with error handling
  let totalUsers = 0;
  const totalFirms = 0;
  let totalJobs = 0;
  let recentJobs: Job[] = [];

  try {
    [totalUsers, totalJobs, recentJobs] = await Promise.all([
      db.user.count(),
      db.job.count(),
      db.job.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
  } catch (error) {
    logger.error('Fetching admin dashboard data', error as Error);
    // Data will remain at default empty values
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">
          System-wide overview and management
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Users"
          value={totalUsers}
          icon="👥"
          description="Across all firms"
        />
        <StatCard
          title="Total Firms"
          value={totalFirms}
          icon="🏢"
          description="Active organizations"
        />
        <StatCard
          title="Total Jobs"
          value={totalJobs}
          icon="📋"
          description="All time"
        />
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Recent Jobs (All Firms)
        </h2>
        <RecentJobs
          jobs={recentJobs}
          emptyMessage="No jobs in the system yet"
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCOPIST DASHBOARD
// ═══════════════════════════════════════════════════════════════
// Dashboard for scopists showing assigned jobs

import { requireRole } from '@/lib/auth';
import { Role } from '@/lib/constants';
import { db } from '@/lib/db';
import { StatCard } from '@/components/dashboard/stat-card';
import { RecentJobs } from '@/components/dashboard/recent-jobs';
import { logger } from '@/lib/logger';
import { Job } from '@prisma/client';

export default async function ScopistDashboard() {
  const session = await requireRole([Role.SCOPIST]);

  // 🔒 Security: Filter all queries by firmId
  const firmId = session.user.firmId;
  
  if (!firmId) {
    logger.error('Scopist without firmId attempted dashboard access', 'ScopistDashboard', undefined, {
      userId: session.user.id,
    });
    throw new Error('Scopist must be associated with a firm');
  }

  // Get current month date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch statistics with error handling
  let assignedJobs = 0;
  let inProgressJobs = 0;
  let completedThisMonth = 0;
  let recentJobs: Job[] = [];

  try {
    const [
      assignedCount,
      inProgressCount,
      completedCount,
      recentJobAssignments,
    ] = await Promise.all([
      // Total assigned jobs
      db.jobAssignment.count({
        where: {
          scopistId: session.user.id,
          job: {
            firmId,
          },
        },
      }),
      // Jobs currently in progress
      db.jobAssignment.count({
        where: {
          scopistId: session.user.id,
          status: 'IN_PROGRESS',
          job: {
            firmId,
          },
        },
      }),
      // Jobs completed this month
      db.jobAssignment.count({
        where: {
          scopistId: session.user.id,
          status: 'COMPLETED',
          job: {
            firmId,
          },
          completedAt: {
            gte: startOfMonth,
          },
        },
      }),
      // Recent job assignments with job details
      db.jobAssignment.findMany({
        where: {
          scopistId: session.user.id,
          job: {
            firmId,
          },
        },
        include: {
          job: true,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    assignedJobs = assignedCount;
    inProgressJobs = inProgressCount;
    completedThisMonth = completedCount;
    recentJobs = recentJobAssignments.map((assignment) => assignment.job);
  } catch (error) {
    logger.dbError('Fetching scopist dashboard data', error as Error, {
      userId: session.user.id,
      firmId,
    });
    // Data will remain at default empty values
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Scopist Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back, {session.user.name}
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Assigned Jobs"
          value={assignedJobs}
          icon="📋"
          description="Total assignments"
        />
        <StatCard
          title="In Progress"
          value={inProgressJobs}
          icon="🔄"
          description="Currently working on"
        />
        <StatCard
          title="Completed This Month"
          value={completedThisMonth}
          icon="✅"
          description={`Since ${startOfMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
        />
      </div>

      {/* Recent Assignments */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Recent Assignments
        </h2>
        <RecentJobs 
          jobs={recentJobs}
          emptyMessage="You don&apos;t have any job assignments yet"
        />
      </div>
    </div>
  );
}

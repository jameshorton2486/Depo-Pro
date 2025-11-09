// ═══════════════════════════════════════════════════════════════
// COURT REPORTER DASHBOARD
// ═══════════════════════════════════════════════════════════════
// Dashboard for court reporters showing their jobs and assignments

import { requireRole } from '@/lib/auth';
import { Role, JobStatus } from '@/lib/constants';
import { db } from '@/lib/db';
import { StatCard } from '@/components/dashboard/stat-card';
import { RecentJobs } from '@/components/dashboard/recent-jobs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { Job } from '@prisma/client';

export default async function ReporterDashboard() {
  const session = await requireRole([Role.COURT_REPORTER]);

  // 🔒 Security: Filter all queries by firmId
  const firmId = session.user.firmId;
  
  if (!firmId) {
    logger.error('Court reporter without firmId attempted dashboard access', 'ReporterDashboard', undefined, {
      userId: session.user.id,
    });
    throw new Error('Court reporter must be associated with a firm');
  }

  // Get current month date range
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch statistics with error handling
  let activeJobs = 0;
  let pendingAssignments = 0;
  let completedThisMonth = 0;
  let recentJobs: Job[] = [];

  try {
    [activeJobs, pendingAssignments, completedThisMonth, recentJobs] = await Promise.all([
      // Active jobs (not completed)
      db.job.count({
        where: {
          firmId,
          reporterId: session.user.id,
          status: {
            not: JobStatus.COMPLETED,
          },
        },
      }),
      // Pending assignments (jobs assigned but not accepted)
      db.jobAssignment.count({
        where: {
          job: {
            firmId,
            reporterId: session.user.id,
          },
          status: 'PENDING',
        },
      }),
      // Jobs completed this month
      db.job.count({
        where: {
          firmId,
          reporterId: session.user.id,
          status: JobStatus.COMPLETED,
          completedAt: {
            gte: startOfMonth,
          },
        },
      }),
      // Recent jobs
      db.job.findMany({
        where: {
          firmId,
          reporterId: session.user.id,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
  } catch (error) {
    logger.dbError('Fetching reporter dashboard data', error as Error, {
      userId: session.user.id,
      firmId,
    });
    // Data will remain at default empty values
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Court Reporter Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {session.user.name}
          </p>
        </div>
        <Button asChild>
          <Link href="/jobs/new">Create New Job</Link>
        </Button>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Active Jobs"
          value={activeJobs}
          icon="📋"
          description="In progress or assigned"
        />
        <StatCard
          title="Pending Assignments"
          value={pendingAssignments}
          icon="⏳"
          description="Waiting for scopist acceptance"
        />
        <StatCard
          title="Completed This Month"
          value={completedThisMonth}
          icon="✅"
          description={`Since ${startOfMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
        />
      </div>

      {/* Recent Jobs */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Recent Jobs
        </h2>
        <RecentJobs 
          jobs={recentJobs}
          emptyMessage="You haven&apos;t created any jobs yet"
          showCreateButton={true}
        />
      </div>
    </div>
  );
}

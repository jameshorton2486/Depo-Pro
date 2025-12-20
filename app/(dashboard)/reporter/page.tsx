// app/(dashboard)/reporter/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import {
  Briefcase,
  Clock,
  Users,
  CheckCircle,
  Plus,
  Upload,
  UserPlus,
  Download,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { RecentJobs } from '@/components/dashboard/recent-jobs';
import { startOfMonth } from 'date-fns';

export default async function ReporterDashboard() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string; firmId?: string };

  if (user.role !== 'REPORTER' && user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Fetch stats
  const [totalJobs, pendingJobs, withScopist, completedThisMonth, recentJobs] = await Promise.all([
    // Total jobs
    prisma.job.count({
      where: { createdById: user.id },
    }),
    // Pending transcription
    prisma.job.count({
      where: {
        createdById: user.id,
        status: { in: ['CREATED', 'FILES_UPLOADED', 'TRANSCRIBING'] },
      },
    }),
    // With scopist
    prisma.job.count({
      where: {
        createdById: user.id,
        status: { in: ['ASSIGNED', 'READY_FOR_EDIT', 'IN_EDIT'] },
      },
    }),
    // Completed this month
    prisma.job.count({
      where: {
        createdById: user.id,
        status: 'COMPLETED',
        updatedAt: { gte: startOfMonth(new Date()) },
      },
    }),
    // Recent jobs
    prisma.job.findMany({
      where: { createdById: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    }),
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Reporter Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage your depositions and transcripts
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
            text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Job
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Jobs"
          value={totalJobs}
          icon={Briefcase}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          title="Pending Transcription"
          value={pendingJobs}
          icon={Clock}
          iconColor="text-yellow-600"
          iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
        />
        <StatCard
          title="With Scopist"
          value={withScopist}
          icon={Users}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
        />
        <StatCard
          title="Completed This Month"
          value={completedThisMonth}
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBgColor="bg-green-100 dark:bg-green-900/30"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Jobs */}
        <div className="lg:col-span-2">
          <RecentJobs jobs={recentJobs} />
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200
          dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <Link
              href="/jobs/new"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50
                dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  Upload New Recording
                </p>
                <p className="text-sm text-slate-500">Start a new transcription</p>
              </div>
            </Link>

            <Link
              href="/jobs?filter=ai_complete"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50
                dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <UserPlus className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  Assign to Scopist
                </p>
                <p className="text-sm text-slate-500">Jobs ready for review</p>
              </div>
            </Link>

            <Link
              href="/jobs?filter=completed"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50
                dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Download className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  Export Transcripts
                </p>
                <p className="text-sm text-slate-500">Download completed work</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

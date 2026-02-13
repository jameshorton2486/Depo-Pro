// app/(dashboard)/reporter/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-compat';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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
  Mic,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { RecentJobs } from '@/components/dashboard/recent-jobs';
import { getCachedJobCounts, getCachedRecentJobs } from '@/lib/cache/dashboard';

export const dynamic = 'force-dynamic';

export default async function ReporterDashboard() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string; firmId?: string };

  if (user.role !== 'REPORTER' && user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Fetch stats using cached queries if firmId is available, otherwise fall back to real-time for personal jobs
  // For reporters, we often want to see personal jobs, but we can use cached firm stats for overview
  const supabase = await createSupabaseServerClient();

  const [jobCounts, recentJobsResult] = await Promise.all([
    user.firmId ? getCachedJobCounts(user.firmId) : Promise.resolve({ total: 0, pending: 0, processing: 0, completed: 0, failed: 0 }),
    user.firmId
      ? getCachedRecentJobs(user.firmId, 5)
      : supabase
          .from('jobs')
          .select('id, title, case_name, status, updated_at')
          .eq('created_by_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(5),
  ]);

  // Transform recentJobs to match expected format for component
  const recentJobs = user.firmId
    ? recentJobsResult
    : (Array.isArray(recentJobsResult) ? recentJobsResult : (recentJobsResult?.data || [])).map((job: any) => ({
        id: job.id,
        title: job.title || job.case_name || 'Untitled Job',
        status: job.status,
        updatedAt: job.updated_at,
      }));

  const formattedRecentJobs = (Array.isArray(recentJobs) ? recentJobs : []).map((job: any) => ({
    id: job.id,
    title: job.title || job.case_name || 'Untitled Job',
    status: job.status,
    updatedAt: job.updatedAt || job.updated_at,
  }));

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
        <div className="flex items-center gap-3">
          <Link
            href="/cases/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
              text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Case (AI Intake)
          </Link>
          <Link
            href="/jobs/new"
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700
              text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Job
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Jobs"
          value={jobCounts.total}
          icon={Briefcase}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          title="Pending Transcription"
          value={jobCounts.pending}
          icon={Clock}
          iconColor="text-yellow-600"
          iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
        />
        <StatCard
          title="Processing"
          value={jobCounts.processing}
          icon={Users}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
        />
        <StatCard
          title="Completed"
          value={jobCounts.completed}
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBgColor="bg-green-100 dark:bg-green-900/30"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Jobs */}
        <div className="lg:col-span-2">
          <RecentJobs jobs={formattedRecentJobs} />
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200
          dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <Link
              href="/transcription-tool"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50
                dark:hover:bg-slate-700/50 transition-colors border-2 border-indigo-200 dark:border-indigo-800"
            >
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Mic className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  High-Accuracy Transcription
                </p>
                <p className="text-sm text-slate-500">Audio normalized for best results</p>
              </div>
            </Link>

            <Link
              href="/cases/new"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50
                dark:hover:bg-slate-700/50 transition-colors border-2 border-blue-200 dark:border-blue-800"
            >
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Plus className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  New Case (AI Intake)
                </p>
                <p className="text-sm text-slate-500">Upload documents & audio</p>
              </div>
            </Link>

            <Link
              href="/jobs/new"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50
                dark:hover:bg-slate-700/50 transition-colors"
            >
              <div className="p-2 bg-slate-100 dark:bg-slate-900/30 rounded-lg">
                <Upload className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  Upload New Recording
                </p>
                <p className="text-sm text-slate-500">Manual job creation</p>
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



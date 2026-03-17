// app/(dashboard)/reporter/page.tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
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
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { isAdminRole } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function ReporterDashboard() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.role !== 'REPORTER' && !isAdminRole(currentUser.role)) {
    redirect('/dashboard');
  }

  // Fetch stats using cached queries if firmId is available, otherwise fall back to real-time for personal jobs
  // For reporters, we often want to see personal jobs, but we can use cached firm stats for overview
  const supabase = await createSupabaseServerClient();

  const [jobCounts, recentJobsResult] = await Promise.all([
    currentUser.firmId ? getCachedJobCounts(currentUser.firmId) : Promise.resolve({ total: 0, pending: 0, processing: 0, completed: 0, failed: 0 }),
    currentUser.firmId
      ? getCachedRecentJobs(currentUser.firmId, 5)
      : supabase
          .from('jobs')
          .select('id, title, case_name, status, updated_at')
          .eq('created_by_id', currentUser.id)
          .order('updated_at', { ascending: false })
          .limit(5),
  ]);

  // Fetch active depositions grouped by cause number for the directory
  const { data: activeJobs } = await supabase
    .from('jobs')
    .select('id, title, case_name, case_number, deponent_name, deposition_date, status, updated_at')
    .eq('created_by_id', currentUser.id)
    .not('status', 'in', '("COMPLETED","CANCELLED","ARCHIVED")')
    .order('case_number', { ascending: true })
    .order('deposition_date', { ascending: true })
    .limit(50);

  // Group by case_number
  const depositionsByCause = (activeJobs || []).reduce<Record<string, typeof activeJobs>>((acc, job) => {
    const key = (job.case_number || job.case_name || 'No Cause Number').trim();
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(job);
    return acc;
  }, {});

  // Transform recentJobs to match expected format for component
  const recentJobs = currentUser.firmId
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
    <ErrorBoundary pageName="reporter-dashboard">
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

      {/* Active Depositions Directory */}
      {Object.keys(depositionsByCause).length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Active Depositions</h2>
            <Link href="/jobs" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {Object.entries(depositionsByCause).map(([causeKey, jobs]) => (
              <div key={causeKey} className="rounded-xl border bg-white dark:bg-slate-800 shadow-sm">
                <div className="border-b bg-slate-50 dark:bg-slate-700/50 px-4 py-2 rounded-t-xl">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {causeKey}
                  </p>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {jobs?.[0]?.case_name || causeKey}
                  </p>
                </div>
                <ul className="divide-y dark:divide-slate-700">
                  {(jobs || []).map((job) => (
                    <li key={job.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                          {job.deponent_name || job.title}
                        </p>
                        {job.deposition_date && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(job.deposition_date).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 flex items-center gap-3 shrink-0">
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {job.status?.replace(/_/g, ' ') || 'Unknown'}
                        </span>
                        <Link
                          href={`/jobs/${job.id}`}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          Open →
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="border-t dark:border-slate-700 px-4 py-2 rounded-b-xl">
                  <Link
                    href="/jobs/new"
                    className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    + Add another deponent to this case
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              href="/jobs/new"
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
    </ErrorBoundary>
  );
}

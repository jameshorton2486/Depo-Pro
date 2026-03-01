// app/(dashboard)/admin/page.tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  Users,
  Briefcase,
  Building2,
  Activity,
  Mic,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { RecentJobs } from '@/components/dashboard/recent-jobs';
import { RxQueueManager } from '@/components/billing/rx-queue-manager';
import { HealthDashboard } from '@/components/admin/health-dashboard';
import { ActionConsole } from '@/components/admin/action-console';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Fetch admin stats
  const supabase = await createSupabaseServerClient();
  const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = getSupabaseAdminClient();

  // Get user count from Supabase Auth (not users table)
  const { data: usersData } = await adminClient.auth.admin.listUsers();
  const totalUsers = usersData?.users?.length || 0;

  const [jobsResult, firmsResult, activeJobsResult, recentJobsResult] = await Promise.all([
    supabase.from('jobs').select('id', { count: 'exact', head: true }),
    supabase.from('firms').select('id', { count: 'exact', head: true }),
    supabase.from('jobs')
      .select('id', { count: 'exact', head: true })
      .in('status', ['CREATED', 'FILES_UPLOADED', 'TRANSCRIBING', 'AI_REVIEWING', 'READY_FOR_EDIT', 'ASSIGNED', 'IN_EDIT']),
    supabase.from('jobs')
      .select('id, title, status, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10),
  ]);
  const totalJobs = jobsResult.count || 0;
  const totalFirms = firmsResult.count || 0;
  const activeJobs = activeJobsResult.count || 0;
  const recentJobs = (recentJobsResult.data || []).map((job: any) => ({
    id: job.id,
    title: job.title,
    status: job.status,
    updatedAt: job.updated_at,
  }));

  return (
    <ErrorBoundary pageName="admin-dashboard">
      <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Admin Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            System overview and management
          </p>
        </div>
        <Link
          href="/transcription-tool"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700
            text-white font-medium rounded-lg transition-colors"
        >
          <Mic className="w-4 h-4" />
          High-Accuracy Transcription
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={totalUsers}
          icon={Users}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          title="Total Jobs"
          value={totalJobs}
          icon={Briefcase}
          iconColor="text-green-600"
          iconBgColor="bg-green-100 dark:bg-green-900/30"
        />
        <StatCard
          title="Firms"
          value={totalFirms}
          icon={Building2}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
        />
        <StatCard
          title="Active Jobs"
          value={activeJobs}
          icon={Activity}
          iconColor="text-yellow-600"
          iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
        />
      </div>

      {/* Recent Jobs */}
      <div className="mb-8">
        <RecentJobs jobs={recentJobs} />
      </div>

      {/* System Health - Phase 3D-3 */}
      <div className="mb-8">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            System Health
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Real-time system status monitoring
          </p>
        </div>
        <HealthDashboard />
      </div>

      {/* Admin Action Console - Phase 4D-1 */}
      <div className="mb-8">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Admin Actions
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            View all sensitive admin actions and overrides
          </p>
        </div>
        <ActionConsole />
      </div>

      {/* RX Queue Manager */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Manual RX Queue
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Manage forensic audio enhancement jobs
            </p>
          </div>
          <Link href="/admin/rx-queue">
            <Button variant="outline">View Full Queue</Button>
          </Link>
        </div>
        <RxQueueManager />
      </div>
      </div>
    </ErrorBoundary>
  );
}

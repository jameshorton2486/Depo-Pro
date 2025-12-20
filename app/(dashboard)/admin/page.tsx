// app/(dashboard)/admin/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  Users,
  Briefcase,
  Building2,
  Activity,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { RecentJobs } from '@/components/dashboard/recent-jobs';

export default async function AdminDashboard() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string; firmId?: string };

  if (user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Fetch admin stats
  const [totalUsers, totalJobs, totalFirms, activeJobs, recentJobs] = await Promise.all([
    prisma.user.count(),
    prisma.job.count(),
    prisma.firm.count(),
    prisma.job.count({
      where: {
        status: { in: ['CREATED', 'FILES_UPLOADED', 'TRANSCRIBING', 'AI_REVIEWING', 'READY_FOR_EDIT', 'ASSIGNED', 'IN_EDIT'] },
      },
    }),
    prisma.job.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 10,
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Admin Dashboard
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          System overview and management
        </p>
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
      <RecentJobs jobs={recentJobs} />
    </div>
  );
}

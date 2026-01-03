// =============================================================================
// REPORTER DASHBOARD
// app/dashboard/reporter/page.tsx
//
// Reporter-specific dashboard with stats and recent jobs
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Briefcase, Clock, Play, CheckCircle, Plus, Calendar } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';

export default async function ReporterDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string; name?: string };

  if (user.role !== 'REPORTER' && user.role !== 'COURT_REPORTER' && user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Fetch stats
  const [totalJobs, pendingJobs, inProgressJobs, completedJobs, recentJobs] = await Promise.all([
    db.job.count({ where: { createdById: user.id } }),
    db.job.count({ 
      where: { 
        createdById: user.id,
        status: 'CREATED',
      } 
    }),
    db.job.count({ 
      where: { 
        createdById: user.id,
        status: { in: ['FILES_UPLOADED', 'TRANSCRIBING', 'AI_REVIEWING', 'READY_FOR_EDIT', 'ASSIGNED', 'IN_EDIT'] } 
      } 
    }),
    db.job.count({ 
      where: { 
        createdById: user.id,
        status: { in: ['SCOPIST_COMPLETE', 'FINALIZED', 'DELIVERED'] } 
      } 
    }),
    db.job.findMany({
      where: { createdById: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { 
        scopist: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        transcription: {
          select: {
            status: true,
            wordCount: true,
          },
        },
      },
    }),
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Welcome back, {user.name || 'Reporter'}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Here's your reporting overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Jobs"
          value={totalJobs}
          icon={Briefcase}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          title="Pending"
          value={pendingJobs}
          icon={Clock}
          iconColor="text-yellow-600"
          iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
        />
        <StatCard
          title="In Progress"
          value={inProgressJobs}
          icon={Play}
          iconColor="text-indigo-600"
          iconBgColor="bg-indigo-100 dark:bg-indigo-900/30"
        />
        <StatCard
          title="Completed"
          value={completedJobs}
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBgColor="bg-green-100 dark:bg-green-900/30"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4 mb-8">
        <Link
          href="/transcription/upload"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Job
        </Link>
        <Link
          href="/dashboard/reporter/calendar"
          className="bg-white hover:bg-gray-50 text-indigo-600 px-6 py-3 rounded-lg font-semibold border-2 border-indigo-600 transition-colors flex items-center"
        >
          <Calendar className="w-5 h-5 mr-2" />
          View Calendar
        </Link>
      </div>

      {/* Recent Jobs */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recent Jobs</h2>
          <Link
            href="/dashboard/reporter/jobs"
            className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold"
          >
            View All →
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow">
          {recentJobs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No jobs yet. Create your first job to get started.</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{job.caseName || job.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {job.scopist && (
                          <>Scopist: {job.scopist.firstName} {job.scopist.lastName} • </>
                        )}
                        Status: {job.status}
                        {job.transcription?.wordCount && (
                          <> • {job.transcription.wordCount.toLocaleString()} words</>
                        )}
                      </p>
                    </div>
                    <span className="text-sm text-gray-400">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

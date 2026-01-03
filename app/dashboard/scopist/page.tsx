// =============================================================================
// SCOPIST DASHBOARD
// app/dashboard/scopist/page.tsx
//
// Scopist-specific dashboard with assigned jobs queue
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { Inbox, CheckCircle } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';

export default async function ScopistDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string; name?: string };

  if (user.role !== 'SCOPIST' && user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Fetch assigned jobs
  const [assignedJobs, completedCount] = await Promise.all([
    db.job.findMany({
      where: {
        scopistId: user.id,
        status: { in: ['READY_FOR_EDIT', 'IN_EDIT', 'AI_REVIEWING'] },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        transcription: {
          select: {
            status: true,
            flaggedWordCount: true,
            wordCount: true,
          },
        },
      },
    }),
    db.job.count({
      where: { 
        scopistId: user.id,
        status: { in: ['SCOPIST_COMPLETE', 'COMPLETED'] },
      },
    }),
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Scopist Dashboard
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Jobs assigned to you for review
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <StatCard
          title="In Queue"
          value={assignedJobs.length}
          icon={Inbox}
          iconColor="text-indigo-600"
          iconBgColor="bg-indigo-100 dark:bg-indigo-900/30"
        />
        <StatCard
          title="Completed"
          value={completedCount}
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBgColor="bg-green-100 dark:bg-green-900/30"
        />
      </div>

      {/* Job Queue */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Review Queue</h2>
        <div className="space-y-4">
          {assignedJobs.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No jobs in your queue.</p>
            </div>
          ) : (
            assignedJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-lg shadow p-6 flex justify-between items-center hover:shadow-md transition-shadow"
              >
                <div>
                  <h3 className="font-medium text-lg">{job.caseName || job.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  From: {job.createdBy.firstName} {job.createdBy.lastName}
                    {job.transcription && (
                      <>
                        {' • '}
                        {job.transcription.flaggedWordCount || 0} flagged words
                        {job.transcription.wordCount && (
                          <> of {job.transcription.wordCount.toLocaleString()} total</>
                        )}
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Status: {job.status} • Updated: {new Date(job.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/transcripts/${job.id}/review`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Start Review
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

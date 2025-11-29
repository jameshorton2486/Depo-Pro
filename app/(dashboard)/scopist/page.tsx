// app/(dashboard)/scopist/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { 
  Briefcase, 
  Clock, 
  CheckCircle,
  Play,
  Keyboard,
  MousePointer,
  FileCheck
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { startOfMonth } from 'date-fns';
import { FlaggedWord } from '@/types/transcript';

export default async function ScopistDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string; firmId?: string };

  if (user.role !== 'SCOPIST' && user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Fetch stats and assigned jobs
  const [activeJobs, pendingReview, completedThisMonth, totalCompleted, assignedJobs] = await Promise.all([
    // Active jobs (assigned to me, not completed)
    prisma.jobAssignment.count({
      where: {
        scopistId: user.id,
        status: { not: 'COMPLETED' },
      },
    }),
    // Pending review (AI complete, assigned to me)
    prisma.job.count({
      where: {
        assignments: { some: { scopistId: user.id } },
        status: { in: ['AI_COMPLETE', 'SCOPIST_ASSIGNED', 'ASSIGNED'] },
      },
    }),
    // Completed this month
    prisma.jobAssignment.count({
      where: {
        scopistId: user.id,
        status: 'COMPLETED',
        submittedAt: { gte: startOfMonth(new Date()) },
      },
    }),
    // Total completed
    prisma.jobAssignment.count({
      where: {
        scopistId: user.id,
        status: 'COMPLETED',
      },
    }),
    // Assigned jobs with details
    prisma.job.findMany({
      where: {
        assignments: { some: { scopistId: user.id } },
        status: { in: ['AI_COMPLETE', 'SCOPIST_ASSIGNED', 'ASSIGNED', 'IN_EDIT'] },
      },
      include: {
        transcription: {
          select: {
            flaggedSegments: true,
            flaggedWordCount: true,
          },
        },
        assignments: {
          where: { scopistId: user.id },
          select: { status: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
  ]);

  // Calculate progress for each job
  const jobsWithProgress = assignedJobs.map((job) => {
    let flaggedCount = job.transcription?.flaggedWordCount || 0;
    let reviewedCount = 0;

    if (job.transcription?.flaggedSegments) {
      try {
        const flagged: FlaggedWord[] = JSON.parse(job.transcription.flaggedSegments as string);
        flaggedCount = flagged.length;
        reviewedCount = flagged.filter((w) => w.isReviewed).length;
      } catch (e) {
        // Use defaults
      }
    }

    const progress = flaggedCount > 0 ? Math.round((reviewedCount / flaggedCount) * 100) : 0;

    return {
      ...job,
      flaggedCount,
      reviewedCount,
      progress,
    };
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Scopist Dashboard
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Review and edit transcripts
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Jobs"
          value={activeJobs}
          icon={Briefcase}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          title="Pending Review"
          value={pendingReview}
          icon={Clock}
          iconColor="text-yellow-600"
          iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
        />
        <StatCard
          title="Completed This Month"
          value={completedThisMonth}
          icon={CheckCircle}
          iconColor="text-green-600"
          iconBgColor="bg-green-100 dark:bg-green-900/30"
        />
        <StatCard
          title="Total Completed"
          value={totalCompleted}
          icon={FileCheck}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
        />
      </div>

      {/* Job Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 
            dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Your Job Queue
              </h3>
            </div>

            {jobsWithProgress.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">
                  No jobs in your queue. Great work!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {jobsWithProgress.map((job) => (
                  <div key={job.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          {job.title}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {job.deponentName || 'Unknown deponent'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            job.progress > 0
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}
                        >
                          {job.progress > 0 ? 'In Progress' : 'Pending'}
                        </span>
                        <Link
                          href={`/jobs/${job.id}/review`}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 
                            hover:bg-blue-700 text-white text-sm font-medium rounded-lg 
                            transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          {job.progress > 0 ? 'Continue' : 'Start Review'}
                        </Link>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-500 w-32 text-right">
                        {job.reviewedCount} / {job.flaggedCount} words
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 
          dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Quick Tips
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                <Keyboard className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                  Keyboard Shortcuts
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Use ↑↓ to navigate, Space to play, Enter to edit
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
                <MousePointer className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                  Click Timestamps
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Click any timestamp to jump to that point in the audio
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                  Review All Words
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  All flagged words must be reviewed before submitting
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

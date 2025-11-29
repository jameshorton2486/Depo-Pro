// components/dashboard/recent-jobs.tsx
'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Clock, User, ChevronRight } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  status: string;
  deponentName?: string | null;
  updatedAt: Date;
}

interface RecentJobsProps {
  jobs: Job[];
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  AI_COMPLETE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  SCOPIST_ASSIGNED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  SCOPIST_COMPLETE: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  AI_COMPLETE: 'AI Complete',
  SCOPIST_ASSIGNED: 'With Scopist',
  SCOPIST_COMPLETE: 'Review Complete',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

export function RecentJobs({ jobs, className = '' }: RecentJobsProps) {
  if (jobs.length === 0) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 
        dark:border-slate-700 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Recent Jobs
        </h3>
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">No jobs yet</p>
          <Link
            href="/jobs/new"
            className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first job →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 
      dark:border-slate-700 overflow-hidden ${className}`}>
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Recent Jobs
          </h3>
          <Link
            href="/jobs"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {job.title}
                </p>
                <div className="flex items-center gap-4 mt-1">
                  {job.deponentName && (
                    <span className="flex items-center gap-1 text-sm text-slate-500">
                      <User className="w-3 h-3" />
                      {job.deponentName}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-sm text-slate-500">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(job.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  STATUS_COLORS[job.status] || STATUS_COLORS.PENDING
                }`}
              >
                {STATUS_LABELS[job.status] || job.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

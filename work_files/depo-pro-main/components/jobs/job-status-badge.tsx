// ═══════════════════════════════════════════════════════════════
// JOB STATUS BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════

import { JobStatus } from '@prisma/client';
import { cn } from '@/lib/utils';

interface JobStatusBadgeProps {
  status: JobStatus;
  className?: string;
}

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  PROCESSING: {
    label: 'Processing',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  AI_COMPLETE: {
    label: 'AI Complete',
    className: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  },
  WITH_SCOPIST: {
    label: 'With Scopist',
    className: 'bg-purple-100 text-purple-700 border-purple-300',
  },
  SCOPIST_COMPLETE: {
    label: 'Scopist Complete',
    className: 'bg-pink-100 text-pink-700 border-pink-300',
  },
  WITH_COURT_REPORTER: {
    label: 'With Court Reporter',
    className: 'bg-orange-100 text-orange-700 border-orange-300',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700 border-green-300',
  },
  DELIVERED: {
    label: 'Delivered',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-red-100 text-red-700 border-red-300',
  },
  ARCHIVED: {
    label: 'Archived',
    className: 'bg-slate-100 text-slate-700 border-slate-300',
  },
};

export function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

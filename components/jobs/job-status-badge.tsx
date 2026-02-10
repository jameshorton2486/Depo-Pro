// ═══════════════════════════════════════════════════════════════
// JOB STATUS BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════

import type { JobStatus } from '@/types/database';
import { cn } from '@/lib/utils';

interface JobStatusBadgeProps {
  status: JobStatus;
  className?: string;
}

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  CREATED: {
    label: 'Created',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  FILES_UPLOADED: {
    label: 'Files Uploaded',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  ENHANCING_AUDIO: {
    label: 'Enhancing Audio',
    className: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  },
  TRANSCRIBING: {
    label: 'Transcribing',
    className: 'bg-purple-100 text-purple-700 border-purple-300',
  },
  AI_REVIEWING: {
    label: 'AI Reviewing',
    className: 'bg-pink-100 text-pink-700 border-pink-300',
  },
  READY_FOR_EDIT: {
    label: 'Ready for Edit',
    className: 'bg-green-100 text-green-700 border-green-300',
  },
  ASSIGNED: {
    label: 'Assigned',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  IN_EDIT: {
    label: 'In Edit',
    className: 'bg-orange-100 text-orange-700 border-orange-300',
  },
  SUBMITTED_FOR_REVIEW: {
    label: 'Submitted for Review',
    className: 'bg-teal-100 text-teal-700 border-teal-300',
  },
  IN_REVIEW: {
    label: 'In Review',
    className: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  },
  SCOPIST_COMPLETE: {
    label: 'Scopist Complete',
    className: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  REVIEW_COMPLETE: {
    label: 'Review Complete',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-700 border-red-300',
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 border-red-400',
  },
};

export function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}

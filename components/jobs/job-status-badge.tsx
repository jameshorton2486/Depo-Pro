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
  DRAFT: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  ASSIGNED: {
    label: 'Assigned',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700 border-green-300',
  },
  BILLED: {
    label: 'Billed',
    className: 'bg-purple-100 text-purple-700 border-purple-300',
  },
  PAID: {
    label: 'Paid',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-300',
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

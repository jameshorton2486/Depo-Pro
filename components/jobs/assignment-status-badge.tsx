// ═══════════════════════════════════════════════════════════════
// ASSIGNMENT STATUS BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════

// import { AssignmentStatus } from '@prisma/client';
// DISABLED: AssignmentStatus doesn't exist in current schema
import { cn } from '@/lib/utils';

interface AssignmentStatusBadgeProps {
  status: AssignmentStatus;
  className?: string;
}

const statusConfig: Record<AssignmentStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  ACCEPTED: {
    label: 'Accepted',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-purple-100 text-purple-700 border-purple-300',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700 border-green-300',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700 border-red-300',
  },
};

export function AssignmentStatusBadge({ status, className }: AssignmentStatusBadgeProps) {
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

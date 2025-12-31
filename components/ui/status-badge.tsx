import { cn } from '@/lib/utils';

type StatusType =
  | 'pending'
  | 'processing'
  | 'ai_complete'
  | 'in_review'
  | 'complete'
  | 'failed'
  | 'draft'
  | 'active'
  | 'archived';

const statusConfig: Record<
  StatusType,
  { label: string; className: string }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-slate/10 text-slate',
  },
  processing: {
    label: 'Processing',
    className: 'bg-accent/10 text-accent',
  },
  ai_complete: {
    label: 'AI Complete',
    className: 'bg-accent/10 text-accent',
  },
  in_review: {
    label: 'In Review',
    className: 'bg-warning/10 text-warning',
  },
  complete: {
    label: 'Complete',
    className: 'bg-success/10 text-success',
  },
  failed: {
    label: 'Failed',
    className: 'bg-danger/10 text-danger',
  },
  draft: {
    label: 'Draft',
    className: 'bg-slate/10 text-slate',
  },
  active: {
    label: 'Active',
    className: 'bg-success/10 text-success',
  },
  archived: {
    label: 'Archived',
    className: 'bg-slate/10 text-slate',
  },
};

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase() as StatusType] || {
    label: status,
    className: 'bg-slate/10 text-slate',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

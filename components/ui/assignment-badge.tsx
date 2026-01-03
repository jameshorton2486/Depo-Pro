'use client';

// =============================================================================
// ASSIGNMENT BADGE
// components/ui/assignment-badge.tsx
//
// Phase 3A-3: Visual indicators for job assignment status
// =============================================================================

import { Badge } from '@/components/ui/badge';
import { User, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AssignmentStatus = 'assigned' | 'pending' | 'overbooked' | 'available';

export interface AssignmentBadgeProps {
  status: AssignmentStatus;
  assigneeName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STATUS_CONFIG: Record<
  AssignmentStatus,
  {
    label: string;
    icon: typeof User;
    className: string;
  }
> = {
  assigned: {
    label: 'Assigned',
    icon: User,
    className: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  overbooked: {
    label: 'Overbooked',
    icon: AlertTriangle,
    className: 'bg-red-500 hover:bg-red-600 text-white',
  },
  available: {
    label: 'Available',
    icon: CheckCircle,
    className: 'bg-green-500 hover:bg-green-600 text-white border-2 border-green-600',
  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function AssignmentBadge({
  status,
  assigneeName,
  size = 'md',
  className,
}: AssignmentBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge
      className={cn(
        'inline-flex items-center gap-1.5 font-medium',
        config.className,
        SIZE_CLASSES[size],
        className
      )}
      title={assigneeName ? `${config.label}: ${assigneeName}` : config.label}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      <span>{config.label}</span>
      {assigneeName && size !== 'sm' && (
        <span className="ml-1 opacity-90">({assigneeName})</span>
      )}
    </Badge>
  );
}

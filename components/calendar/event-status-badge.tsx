'use client';

import { Badge } from '@/components/ui/badge';
import { Lock, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { CalendarEventStatus } from '@/lib/enums';

interface EventStatusBadgeProps {
  status: CalendarEventStatus;
  hasJob?: boolean;
}

const statusConfig: Record<string, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ElementType;
}> = {
  REQUESTED: {
    label: 'Requested',
    variant: 'outline',
    icon: Calendar,
  },
  SCHEDULED: {
    label: 'Scheduled',
    variant: 'outline',
    icon: Calendar,
  },
  CONFIRMED: {
    label: 'Confirmed',
    variant: 'default',
    icon: CheckCircle,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    variant: 'default',
    icon: Calendar,
  },
  COMPLETED: {
    label: 'Completed',
    variant: 'secondary',
    icon: CheckCircle,
  },
  CONVERTED: {
    label: 'Converted',
    variant: 'secondary',
    icon: Lock,
  },
  CANCELLED: {
    label: 'Cancelled',
    variant: 'destructive',
    icon: XCircle,
  },
  RESCHEDULED: {
    label: 'Rescheduled',
    variant: 'outline',
    icon: Calendar,
  },
};

export function EventStatusBadge({ status, hasJob }: EventStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.SCHEDULED;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
      {hasJob && (status === 'CONVERTED' || status === 'COMPLETED') && (
        <span className="ml-1 text-xs">(Job Created)</span>
      )}
    </Badge>
  );
}

/**
 * Check if an event is locked (cannot be dragged/resized)
 */
export function isEventLocked(status: string): boolean {
  return ['CONVERTED', 'CANCELLED', 'COMPLETED'].includes(status);
}

/**
 * Check if an event can be converted to a job
 */
export function canConvertToJob(status: string): boolean {
  return ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(status);
}


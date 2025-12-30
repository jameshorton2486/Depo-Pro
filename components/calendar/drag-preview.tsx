'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface DragPreviewProps {
  eventTitle: string;
  startTime: Date;
  endTime: Date;
  hasConflicts: boolean;
  conflictCount: number;
  isAvailable: boolean;
  className?: string;
}

export function DragPreview({
  eventTitle,
  startTime,
  endTime,
  hasConflicts,
  conflictCount,
  isAvailable,
  className,
}: DragPreviewProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={cn(
        'pointer-events-none fixed z-50 rounded-lg border bg-background p-3 shadow-lg -translate-x-1/2 -translate-y-full',
        isAvailable ? 'border-green-500' : 'border-red-500',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {isAvailable ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{eventTitle}</div>
          <div className="text-xs text-muted-foreground">
            {formatTime(startTime)} - {formatTime(endTime)}
          </div>
        </div>
        {hasConflicts && (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {conflictCount}
          </Badge>
        )}
      </div>
    </div>
  );
}

interface AvailabilityIndicatorProps {
  isAvailable: boolean;
  conflictCount?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function AvailabilityIndicator({
  isAvailable,
  conflictCount = 0,
  size = 'md',
}: AvailabilityIndicatorProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  if (isAvailable) {
    return (
      <div className="flex items-center gap-1">
        <CheckCircle className={cn('text-green-600', sizeClasses[size])} />
        {conflictCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {conflictCount} conflict{conflictCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <XCircle className={cn('text-red-600', sizeClasses[size])} />
      <span className="text-xs text-muted-foreground">
        {conflictCount} conflict{conflictCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

interface DropZoneHighlightProps {
  isActive: boolean;
  isConflict: boolean;
  className?: string;
}

export function DropZoneHighlight({
  isActive,
  isConflict,
  className,
}: DropZoneHighlightProps) {
  if (!isActive) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 rounded border-2 border-dashed pointer-events-none z-10',
        isConflict
          ? 'border-red-500 bg-red-50/50'
          : 'border-green-500 bg-green-50/50',
        className
      )}
    >
      <div
        className={cn(
          'absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium',
          isConflict
            ? 'bg-red-100 text-red-800'
            : 'bg-green-100 text-green-800'
        )}
      >
        {isConflict ? (
          <>
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            Conflicts Detected
          </>
        ) : (
          <>
            <CheckCircle className="h-3 w-3 inline mr-1" />
            Available
          </>
        )}
      </div>
    </div>
  );
}


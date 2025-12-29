'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface CalendarSkeletonProps {
  variant: 'grid' | 'timeline';
}

export function CalendarSkeleton({ variant }: CalendarSkeletonProps) {
  if (variant === 'grid') {
    return (
      <div className="bg-white rounded-lg border">
        {/* Header */}
        <div className="grid grid-cols-7 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        
        {/* Grid cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="min-h-[120px] border-b border-r p-2 space-y-1">
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Timeline skeleton
  return (
    <div className="space-y-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <div className="space-y-2 pl-4 border-l-2 border-gray-200">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}


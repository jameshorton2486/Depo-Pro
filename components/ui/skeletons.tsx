// ═══════════════════════════════════════════════════════════════
// SKELETON LOADERS
// ═══════════════════════════════════════════════════════════════
// Reusable skeleton components for loading states

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Page-level skeleton wrapper
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// Dashboard stat cards skeleton
export function StatCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Job list skeleton
export function JobListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-9 w-9 rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Calendar skeleton
export function CalendarSkeleton() {
  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Calendar toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
          <Skeleton className="h-6 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        {/* Calendar grid */}
        <Skeleton className="h-[500px] w-full rounded-lg" />
      </div>
    </Card>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b bg-slate-50">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-8 ml-auto rounded" />
        </div>
      ))}
    </div>
  );
}

// Transcript viewer skeleton
export function TranscriptSkeletonLoader() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Audio player */}
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-12 w-full rounded" />
        </CardContent>
      </Card>

      {/* Content area */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-32 mb-4" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// Pricing cards skeleton
export function PricingCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className={cn(
          'p-8',
          i === 1 && 'border-2 border-indigo-600 scale-[1.02]'
        )}>
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Form skeleton
export function FormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="flex justify-end gap-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

// Profile/settings skeleton
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <FormSkeleton />
    </div>
  );
}

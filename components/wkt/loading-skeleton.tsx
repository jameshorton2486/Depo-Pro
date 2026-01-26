// WKT loading skeletons

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          <SkeletonBlock className="h-4 w-28" />
        </CardTitle>
        <SkeletonBlock className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <SkeletonBlock className="h-8 w-16" />
        <SkeletonBlock className="mt-2 h-3 w-24" />
      </CardContent>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <SkeletonBlock className="h-8 w-64" />
        <SkeletonBlock className="h-4 w-80" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-24 w-full" />
      </div>
    </div>
  );
}

export function QuestionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-7 w-72" />
          <SkeletonBlock className="h-6 w-24" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <SkeletonBlock className="h-6 w-full" />
          <SkeletonBlock className="h-6 w-11/12" />
          <SkeletonBlock className="h-6 w-10/12" />
          <SkeletonBlock className="h-6 w-9/12" />
        </div>
        <SkeletonBlock className="h-12 w-full" />
      </CardContent>
    </Card>
  );
}

export function PracticeSkeleton() {
  return (
    <div className="flex gap-6">
      <aside className="hidden md:block w-64 flex-shrink-0">
        <Card>
          <CardHeader>
            <CardTitle>
              <SkeletonBlock className="h-4 w-24" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-4 w-32" />
            </div>
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="h-4 w-16" />
            </div>
            <SkeletonBlock className="h-10 w-full" />
          </CardContent>
        </Card>
      </aside>

      <div className="flex-1">
        <div className="md:hidden mb-4">
          <SkeletonBlock className="h-10 w-full" />
        </div>
        <div className="mb-6">
          <SkeletonBlock className="h-4 w-40" />
        </div>
        <QuestionSkeleton />
      </div>
    </div>
  );
}

"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function TranscriptSkeleton() {
  return (
    <div className="space-y-4">
      {/* Audio Player Skeleton */}
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* Transcript Header Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Toolbar Skeleton */}
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-20" />
          </div>

          {/* Transcript Content Skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-12" /> {/* Speaker label */}
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-5 w-3/5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function WaveformSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <Skeleton className="h-20 w-full rounded-lg" />
        <div className="flex items-center justify-between mt-4">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

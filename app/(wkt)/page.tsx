// ═══════════════════════════════════════════════════════════════
// WKT DASHBOARD
// ═══════════════════════════════════════════════════════════════
// Home page for WKT Prep module

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, FileText, TrendingUp, Clock } from 'lucide-react';
import { DashboardSkeleton } from '@/components/wkt/loading-skeleton';
import { ErrorMessage } from '@/components/wkt/error-message';

type ProgressResponse = {
  totalQuestions: number;
  questionsAttempted: number;
  questionsMastered: number;
  currentStreak: number;
  readiness: {
    overallScore: number;
    isReady: boolean;
    recommendation: string;
  };
};

export default function WKTDashboard() {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isMountedRef: { current: boolean }) => {
    setIsLoading(true);
    setError(null);

    try {
      const progressResponse = await fetch('/api/wkt/progress');

      if (!progressResponse.ok) {
        throw new Error('Failed to load progress');
      }

      if (isMountedRef.current) {
        const progressData = (await progressResponse.json()) as ProgressResponse;
        setProgress(progressData);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const isMountedRef = { current: true };

    loadData(isMountedRef);
    return () => {
      isMountedRef.current = false;
    };
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {error ? (
        <ErrorMessage
          message={error}
          onRetry={() => loadData({ current: true })}
        />
      ) : null}

      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome to WKT Prep</h1>
        <p className="text-muted-foreground">
          Prepare for your Texas CSR Written Knowledge Test
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progress?.totalQuestions ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {error ? 'Unable to load' : 'Build your study plan'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions Attempted</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progress?.questionsAttempted ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {error ? 'Unable to load' : 'Keep improving'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions Mastered</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progress?.questionsMastered ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {error ? 'Unable to load' : 'Keep the momentum'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {`${progress?.currentStreak ?? 0} days`}
            </div>
            <p className="text-xs text-muted-foreground">
              {progress?.currentStreak ? 'Keep it going' : 'Start your streak today'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/wkt/practice">
          <Button size="lg" className="w-full h-24 text-lg">
            Start Practice
          </Button>
        </Link>
        <Link href="/wkt/mock-exam">
          <Button size="lg" variant="outline" className="w-full h-24 text-lg">
            Take Mock Exam
          </Button>
        </Link>
      </div>

      {/* Readiness Card */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Readiness</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-muted-foreground">{error}</p>
          ) : (
            <p className="text-muted-foreground">
              {progress?.readiness?.recommendation ||
                'Your exam readiness will appear here after you start practicing.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

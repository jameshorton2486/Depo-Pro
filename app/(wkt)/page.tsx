// ═══════════════════════════════════════════════════════════════
// WKT DASHBOARD
// ═══════════════════════════════════════════════════════════════
// Home page for WKT Prep module

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, FileText, TrendingUp, Clock } from 'lucide-react';

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
  const [examCount, setExamCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [progressResponse, examsResponse, reviewResponse] = await Promise.all([
          fetch('/api/wkt/progress'),
          fetch('/api/wkt/exams?limit=1'),
          fetch('/api/wkt/progress/review-queue'),
        ]);

        if (!progressResponse.ok) {
          throw new Error('Failed to load progress');
        }

        if (isMounted) {
          const progressData = (await progressResponse.json()) as ProgressResponse;
          setProgress(progressData);
        }

        if (examsResponse.ok && isMounted) {
          const examsData = await examsResponse.json();
          setExamCount(Array.isArray(examsData.exams) ? examsData.exams.length : 0);
        }

        if (reviewResponse.ok && isMounted) {
          const reviewData = await reviewResponse.json();
          setReviewCount(typeof reviewData.count === 'number' ? reviewData.count : 0);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
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
            <CardTitle className="text-sm font-medium">Questions Mastered</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : progress?.questionsMastered ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {error ? 'Unable to load' : 'Keep practicing!'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mock Exams Taken</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '...' : examCount}</div>
            <p className="text-xs text-muted-foreground">
              {examCount > 0 ? 'Keep improving' : 'Take your first exam'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `${progress?.currentStreak ?? 0} days`}
            </div>
            <p className="text-xs text-muted-foreground">
              {progress?.currentStreak ? 'Keep it going' : 'Start your streak today'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due for Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : reviewCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {reviewCount > 0 ? 'Ready to review' : 'No questions due'}
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
          {isLoading ? (
            <p className="text-muted-foreground">Loading readiness...</p>
          ) : error ? (
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

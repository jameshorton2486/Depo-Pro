// ═══════════════════════════════════════════════════════════════
// WKT PROGRESS DASHBOARD
// ═══════════════════════════════════════════════════════════════

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CATEGORY_INFO } from '@/types/wkt';
import type { CategoryStats, WKTCategory, WKTMockExam } from '@/types/wkt';

type ProgressResponse = {
  totalQuestions: number;
  questionsAttempted: number;
  questionsMastered: number;
  currentStreak: number;
  categoryStats: CategoryStats[];
  readiness: {
    overallScore: number;
    isReady: boolean;
    recommendation: string;
  };
};

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [exams, setExams] = useState<WKTMockExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        const [progressResponse, examsResponse] = await Promise.all([
          fetch('/api/wkt/progress'),
          fetch('/api/wkt/exams?limit=5'),
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
          setExams(Array.isArray(examsData.exams) ? examsData.exams : []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load progress');
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

  const weakCategories = useMemo(() => {
    if (!progress?.categoryStats?.length) {
      return [];
    }

    return [...progress.categoryStats]
      .filter((stat) => stat.attempted > 0)
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 2);
  }, [progress?.categoryStats]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Readiness Score */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Readiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-6xl font-bold mb-2">
              {isLoading ? '...' : `${progress?.readiness?.overallScore ?? 0}%`}
            </div>
            <p className="text-muted-foreground mb-6">
              {error
                ? error
                : progress?.readiness?.recommendation ||
                  'Start practicing to build your readiness score'}
            </p>
            <Link href="/wkt/mock-exam">
              <Button size="lg">Take Mock Exam</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : progress?.totalQuestions ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Attempted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : progress?.questionsAttempted ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Mastered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : progress?.questionsMastered ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `${progress?.currentStreak ?? 0} days`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Progress */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Category Progress</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading category stats...</p>
        ) : error ? (
          <p className="text-muted-foreground">{error}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(progress?.categoryStats || []).map((stat) => {
              const categoryInfo = CATEGORY_INFO[stat.category as WKTCategory];
              const progressValue = stat.total > 0 ? (stat.attempted / stat.total) * 100 : 0;

              return (
                <Card key={stat.category}>
                  <CardHeader>
                    <CardTitle className="text-lg">{categoryInfo.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progress</span>
                        <span>{Math.round(progressValue)}%</span>
                      </div>
                      <Progress value={progressValue} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {stat.attempted} / {stat.total} attempted
                    </p>
                    <Link href="/wkt/practice">
                      <Button variant="outline" className="w-full">
                        Practice
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Mock Exams */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Mock Exams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground mb-4">Loading exam history...</p>
          ) : exams.length === 0 ? (
            <>
              <p className="text-muted-foreground mb-4">
                No mock exams taken yet
              </p>
              <Link href="/wkt/mock-exam">
                <Button>Take Your First Exam</Button>
              </Link>
            </>
          ) : (
            <div className="space-y-3">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">Mock Exam</p>
                    <p className="text-sm text-muted-foreground">
                      {exam.completed_at
                        ? new Date(exam.completed_at).toLocaleDateString()
                        : 'In progress'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      {typeof exam.score_percentage === 'number'
                        ? `${Math.round(exam.score_percentage)}%`
                        : '--'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {exam.passed === null
                        ? 'Pending'
                        : exam.passed
                          ? 'Passed'
                          : 'Needs work'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weak Areas */}
      <Card>
        <CardHeader>
          <CardTitle>Weak Areas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading weak areas...</p>
          ) : weakCategories.length === 0 ? (
            <p className="text-muted-foreground">
              Complete some practice sessions to identify weak areas
            </p>
          ) : (
            <div className="space-y-2">
              {weakCategories.map((category) => (
                <div key={category.category} className="flex items-center justify-between">
                  <span>{CATEGORY_INFO[category.category as WKTCategory].label}</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(category.percentage)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

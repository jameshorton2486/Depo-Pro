// ═══════════════════════════════════════════════════════════════
// WKT PROGRESS DASHBOARD
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CATEGORY_INFO } from '@/types/wkt';
import type { WKTCategory } from '@/types/wkt';

const CATEGORY_QUESTION_COUNTS: Record<WKTCategory, number> = {
  medical_terminology: 95,
  legal_terminology: 95,
  grammar_usage: 86,
  spelling: 86,
  texas_rules: 115,
  reporter_duties: 96,
};

export default function ProgressPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Readiness Score */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Readiness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-6xl font-bold mb-2">0%</div>
            <p className="text-muted-foreground mb-6">
              Start practicing to build your readiness score
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
            <div className="text-2xl font-bold">573</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Attempted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Mastered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 days</div>
          </CardContent>
        </Card>
      </div>

      {/* Category Progress */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Category Progress</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(CATEGORY_QUESTION_COUNTS).map(([category, total]) => {
            const categoryInfo = CATEGORY_INFO[category as WKTCategory];
            const attempted = 0;
            const progress = total > 0 ? (attempted / total) * 100 : 0;

            return (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-lg">{categoryInfo.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {attempted} / {total} attempted
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
      </div>

      {/* Recent Mock Exams */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Mock Exams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground mb-4">
            No mock exams taken yet
          </p>
          <Link href="/wkt/mock-exam">
            <Button>Take Your First Exam</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Weak Areas */}
      <Card>
        <CardHeader>
          <CardTitle>Weak Areas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Complete some practice sessions to identify weak areas
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

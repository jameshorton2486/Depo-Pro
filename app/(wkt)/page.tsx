// ═══════════════════════════════════════════════════════════════
// WKT DASHBOARD
// ═══════════════════════════════════════════════════════════════
// Home page for WKT Prep module

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, FileText, TrendingUp, Clock } from 'lucide-react';

export default function WKTDashboard() {
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
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Keep practicing!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mock Exams Taken</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Take your first exam</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 days</div>
            <p className="text-xs text-muted-foreground">Start your streak today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due for Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No questions due</p>
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
          <p className="text-muted-foreground">
            Your exam readiness will appear here after you start practicing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

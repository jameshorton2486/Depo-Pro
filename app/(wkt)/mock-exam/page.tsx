// ═══════════════════════════════════════════════════════════════
// WKT MOCK EXAM - PRE-EXAM SCREEN
// ═══════════════════════════════════════════════════════════════

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle } from 'lucide-react';
import { MOCK_EXAM_DISTRIBUTION, CATEGORY_INFO } from '@/types/wkt';

export default function MockExamPage() {
  function handleStartExam() {
    alert('Exam feature coming soon!');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Mock Examination</h1>
        <p className="text-muted-foreground">
          Simulate the actual Texas CSR Written Knowledge Test
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Questions</p>
              <p className="text-2xl font-bold">100</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Passing Score</p>
              <p className="text-2xl font-bold">75%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Required Correct</p>
              <p className="text-2xl font-bold">75</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Time is tracked but not limited. Take your time to answer each question carefully.
          </p>
        </CardContent>
      </Card>

      {/* Question Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Question Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Questions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(MOCK_EXAM_DISTRIBUTION).map(([category, count]) => (
                <TableRow key={category}>
                  <TableCell>{CATEGORY_INFO[category as keyof typeof CATEGORY_INFO].label}</TableCell>
                  <TableCell className="text-right">{count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          Make sure you have enough time to complete the exam. The exam typically takes 2-3 hours to complete.
        </p>
      </div>

      {/* Start Button */}
      <div className="flex justify-center">
        <Button size="lg" onClick={handleStartExam} className="px-8">
          Start Exam
        </Button>
      </div>
    </div>
  );
}

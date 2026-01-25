// ═══════════════════════════════════════════════════════════════
// WKT MOCK EXAM - RESULTS PAGE (PLACEHOLDER)
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MockExamResultsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Exam Results</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Your results will appear here after completing an exam.
          </p>
          <Link href="/wkt">
            <Button>Back to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

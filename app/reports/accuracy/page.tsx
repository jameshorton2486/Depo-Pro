import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AccuracyReportPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  const supabase = await createSupabaseServerClient();
  let flaggedWordsExists = true;

  const { data: migrationProof } = await supabase
    .from('audit_events')
    .select('id')
    .limit(1);
  void migrationProof;

  const { data: flagStats, error } = await supabase
    .from('flagged_words')
    .select('confidence, status')
    .limit(1000);

  if (error) {
    flaggedWordsExists = false;
  }

  const rows = flagStats || [];
  const totalFlagged = rows.length;
  const averageConfidence = totalFlagged > 0
    ? rows.reduce((sum: number, row: any) => sum + Number(row.confidence || 0), 0) / totalFlagged
    : 0;
  const reviewedCount = rows.filter((row: any) => ['CORRECTED', 'CONFIRMED', 'SKIPPED'].includes(String(row.status))).length;
  const reviewedPercent = totalFlagged > 0 ? (reviewedCount / totalFlagged) * 100 : 0;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Accuracy Report</h1>
        <p className="mt-1 text-sm text-gray-600">Transcription confidence and review completion metrics.</p>
      </div>

      {!flaggedWordsExists ? (
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-700">
          <p className="font-medium text-gray-900">Accuracy metrics are not yet available.</p>
          <p className="mt-2">
            The flagged words data source was not found in this environment. The review pipeline still operates, but aggregate metrics are unavailable.
          </p>
        </div>
      ) : totalFlagged === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-700">
          No transcription accuracy data available yet. Run your first job to see accuracy metrics.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Average Confidence</p>
            <p className="mt-1 text-2xl font-bold">{(averageConfidence * 100).toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Total Flagged Words</p>
            <p className="mt-1 text-2xl font-bold">{totalFlagged.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Reviewed Percentage</p>
            <p className="mt-1 text-2xl font-bold">{reviewedPercent.toFixed(1)}%</p>
          </div>
        </div>
      )}

      <Link href="/reports" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
        Back to Reports
      </Link>
    </div>
  );
}

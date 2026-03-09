import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const STATUS_ORDER = [
  'CREATED',
  'FILES_UPLOADED',
  'TRANSCRIBING',
  'READY_FOR_EDIT',
  'IN_EDIT',
  'COMPLETED',
  'FAILED',
];

export default async function UsageReportPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase.from('jobs').select('status');

  if (currentUser.firmId) {
    query = query.eq('firm_id', currentUser.firmId);
  }

  const { data: jobsByStatus } = await query;

  const statusCounts = (jobsByStatus || []).reduce((acc: Record<string, number>, job: any) => {
    const status = String(job.status || 'UNKNOWN');
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usage Report</h1>
        <p className="mt-1 text-sm text-gray-600">Job volume by workflow status.</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-50 text-left text-sm font-semibold text-gray-700">
            <tr>
              <th className="p-3">Status</th>
              <th className="p-3">Count</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {STATUS_ORDER.map((status) => (
              <tr key={status}>
                <td className="p-3 font-medium">{status}</td>
                <td className="p-3">{statusCounts[status] || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-500">Last updated: {new Date().toLocaleString()}</p>
      <Link href="/reports" className="mt-3 inline-block text-sm text-indigo-600 hover:underline">
        Back to Reports
      </Link>
    </div>
  );
}

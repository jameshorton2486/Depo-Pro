// =============================================================================
// REPORTS PAGE
// app/reports/page.tsx
//
// Reports hub - admin only
// =============================================================================

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import Link from 'next/link';
import { FileText, Activity, BarChart3, Database } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/reports/audit-log"
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <Database className="w-8 h-8 text-indigo-600 mb-3" />
          <h3 className="font-semibold text-lg mb-2">Audit Log</h3>
          <p className="text-sm text-gray-500">View system activity and user actions</p>
        </Link>

        <Link
          href="/reports/usage"
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <BarChart3 className="w-8 h-8 text-gray-400 mb-3" />
          <h3 className="font-semibold text-lg mb-2 text-gray-700">Usage Report</h3>
          <p className="text-sm text-gray-500">Job counts and workflow status distribution</p>
        </Link>

        <Link
          href="/reports/accuracy"
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <Activity className="w-8 h-8 text-gray-400 mb-3" />
          <h3 className="font-semibold text-lg mb-2 text-gray-700">Accuracy Report</h3>
          <p className="text-sm text-gray-500">Flagged-word confidence and review completion</p>
        </Link>

        <Link
          href="/reports/system"
          className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
        >
          <FileText className="w-8 h-8 text-gray-400 mb-3" />
          <h3 className="font-semibold text-lg mb-2 text-gray-700">System Report</h3>
          <p className="text-sm text-gray-500">Infrastructure and environment health summary</p>
        </Link>
      </div>
    </div>
  );
}

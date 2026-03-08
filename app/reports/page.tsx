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

        <div className="bg-gray-100 rounded-lg p-6 opacity-50 cursor-not-allowed">
          <BarChart3 className="w-8 h-8 text-gray-400 mb-3" />
          <h3 className="font-semibold text-lg mb-2 text-gray-500">Usage Report</h3>
          <p className="text-sm text-gray-400">Coming soon</p>
        </div>

        <div className="bg-gray-100 rounded-lg p-6 opacity-50 cursor-not-allowed">
          <Activity className="w-8 h-8 text-gray-400 mb-3" />
          <h3 className="font-semibold text-lg mb-2 text-gray-500">Accuracy Report</h3>
          <p className="text-sm text-gray-400">Coming soon</p>
        </div>

        <div className="bg-gray-100 rounded-lg p-6 opacity-50 cursor-not-allowed">
          <FileText className="w-8 h-8 text-gray-400 mb-3" />
          <h3 className="font-semibold text-lg mb-2 text-gray-500">System Report</h3>
          <p className="text-sm text-gray-400">Coming soon</p>
        </div>
      </div>
    </div>
  );
}

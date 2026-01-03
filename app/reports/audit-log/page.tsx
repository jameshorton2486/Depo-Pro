// =============================================================================
// AUDIT LOG PAGE
// app/reports/audit-log/page.tsx
//
// Basic audit log viewer - admin only
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    action?: string;
  }>;
}

export default async function AuditLogPage({ searchParams }: PageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string };
  const params = await searchParams;

  if (user.role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  const page = parseInt(params.page || '1');
  const action = params.action;

  const where: any = {};
  if (action) {
    where.action = action;
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 50,
      take: 50,
      include: {
        actor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Audit Log</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <form method="get" className="flex gap-4">
          <select
            name="action"
            defaultValue={action}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Actions</option>
            <option value="LOGIN_SUCCESS">Login</option>
            <option value="TRANSCRIPT_EXPORTED">Export</option>
            <option value="TRANSCRIPT_FINALIZED">Finalize</option>
            <option value="USER_ROLE_CHANGED">Role Change</option>
            <option value="TRANSCRIPT_UNLOCKED">Unlock</option>
          </select>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4 font-semibold">Time</th>
              <th className="text-left p-4 font-semibold">User</th>
              <th className="text-left p-4 font-semibold">Action</th>
              <th className="text-left p-4 font-semibold">Target</th>
              <th className="text-left p-4 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="p-4 text-sm text-gray-600">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="p-4 text-sm">
                  {log.actor
                    ? `${log.actor.firstName} ${log.actor.lastName}`
                    : 'System'}
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                    {log.action}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-600">
                  {log.targetType}: {log.targetId}
                </td>
                <td className="p-4 text-sm text-gray-500">
                  {log.metadata && Object.keys(log.metadata).length > 0
                    ? JSON.stringify(log.metadata).substring(0, 100) + '...'
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 50 && (
          <div className="p-4 border-t flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, total)} of {total} entries
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={`?page=${page - 1}${action ? `&action=${action}` : ''}`}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Previous
                </a>
              )}
              {page * 50 < total && (
                <a
                  href={`?page=${page + 1}${action ? `&action=${action}` : ''}`}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Next
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

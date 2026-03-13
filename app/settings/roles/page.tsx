import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { isAdminRole } from '@/lib/admin';

export const dynamic = 'force-dynamic';

const ROLE_ROWS = [
  { role: 'ADMIN', canCreateJobs: 'Yes', canUploadAudio: 'Yes', canReview: 'Yes', canExport: 'Yes', canManageUsers: 'Yes', canViewReports: 'Yes' },
  { role: 'REPORTER', canCreateJobs: 'Yes', canUploadAudio: 'Yes', canReview: 'Yes', canExport: 'Yes', canManageUsers: 'No', canViewReports: 'No' },
  { role: 'SCOPIST', canCreateJobs: 'Assigned only', canUploadAudio: 'No', canReview: 'Yes', canExport: 'Yes', canManageUsers: 'No', canViewReports: 'No' },
  { role: 'ATTORNEY', canCreateJobs: 'No', canUploadAudio: 'No', canReview: 'Read-only', canExport: 'Yes', canManageUsers: 'No', canViewReports: 'No' },
];

function formatCell(value: string) {
  if (value === 'Yes') return '✅';
  if (value === 'No') return '❌';
  return value;
}

export default async function RolesSettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (!isAdminRole(currentUser.role)) {
    redirect('/unauthorized');
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Role Reference</h1>
        <p className="mt-1 text-sm text-gray-600">
          Read-only permission matrix for all supported Depo-Pro roles.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead className="bg-gray-50 text-left text-sm font-semibold text-gray-700">
            <tr>
              <th className="p-3">Role</th>
              <th className="p-3">Can Create Jobs</th>
              <th className="p-3">Can Upload Audio</th>
              <th className="p-3">Can Review Transcripts</th>
              <th className="p-3">Can Export</th>
              <th className="p-3">Can Manage Users</th>
              <th className="p-3">Can View Reports</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {ROLE_ROWS.map((row) => (
              <tr key={row.role}>
                <td className="p-3 font-medium text-gray-900">{row.role}</td>
                <td className="p-3">{formatCell(row.canCreateJobs)}</td>
                <td className="p-3">{formatCell(row.canUploadAudio)}</td>
                <td className="p-3">{formatCell(row.canReview)}</td>
                <td className="p-3">{formatCell(row.canExport)}</td>
                <td className="p-3">{formatCell(row.canManageUsers)}</td>
                <td className="p-3">{formatCell(row.canViewReports)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-gray-600">
        Role assignments are managed in Settings → Users. Contact your firm administrator to request a role change.
      </p>
    </div>
  );
}

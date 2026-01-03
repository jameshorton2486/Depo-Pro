// =============================================================================
// PERMISSION AUDIT VIEW
// app/(dashboard)/admin/permissions/page.tsx
//
// Phase 3D-1: Visual map of route → roles
// =============================================================================

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ROUTE_ACCESS, API_ACCESS } from '@/lib/permissions/route-access';
import { PermissionAuditTable } from '@/components/_future/admin/permission-audit-table';

export const metadata = {
  title: 'Permission Audit | Depo-Pro',
  description: 'View all route permissions and access control',
};

export default async function PermissionsPage() {
  const session = await getCurrentUser();

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Combine all routes
  const allRoutes = [
    ...Object.entries(ROUTE_ACCESS).map(([path, roles]) => ({
      path,
      roles,
      type: 'page' as const,
    })),
    ...Object.entries(API_ACCESS).map(([path, roles]) => ({
      path,
      roles,
      type: 'api' as const,
    })),
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Permission Audit</h1>
        <p className="text-sm text-gray-500 mt-1">
          Complete view of all route permissions and access control
        </p>
      </div>

      <PermissionAuditTable routes={allRoutes} />
    </div>
  );
}

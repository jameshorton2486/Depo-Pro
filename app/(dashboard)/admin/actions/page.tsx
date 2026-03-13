// =============================================================================
// ADMIN ACTIONS PAGE
// app/(dashboard)/admin/actions/page.tsx
//
// Phase 4D-1: Admin action console page
// =============================================================================

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { ActionConsole } from '@/components/admin/action-console';

export const dynamic = 'force-dynamic';

export default async function AdminActionsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Admin Actions
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          View all sensitive admin actions and overrides
        </p>
      </div>

      <ActionConsole />
    </div>
  );
}

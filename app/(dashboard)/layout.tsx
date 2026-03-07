// ═══════════════════════════════════════════════════════════════
// DASHBOARD LAYOUT
// ═══════════════════════════════════════════════════════════════
// Protected layout for all dashboard routes
// Uses role-aware sidebar navigation

export const dynamic = 'force-dynamic';

import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { SidebarLayout } from '@/components/layouts/app-sidebar';
import { Breadcrumbs } from '@/components/layouts/breadcrumbs';
import { type UserRole } from '@/lib/navigation';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('[dashboard/layout] rendering — calling getCurrentUser');
  const currentUser = await getCurrentUser();
  console.log('[dashboard/layout] getCurrentUser result:', {
    hasUser: !!currentUser,
    userId: currentUser?.id ?? 'none',
    role: currentUser?.role ?? 'none',
  });

  if (!currentUser) {
    console.log('[dashboard/layout] no user — redirecting to login');
    redirect('/login');
  }

  const userRole = currentUser.role as UserRole;
  const userName = currentUser.name || currentUser.email;

  return (
    <SidebarLayout userRole={userRole} userName={userName}>
      {/* Page Content with Breadcrumbs */}
      <div className="p-6">
        <Breadcrumbs role={userRole} className="mb-4" />
        <ErrorBoundary pageName="dashboard-layout">
          {children}
        </ErrorBoundary>
      </div>
    </SidebarLayout>
  );
}

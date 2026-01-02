// ═══════════════════════════════════════════════════════════════
// DASHBOARD LAYOUT
// ═══════════════════════════════════════════════════════════════
// Protected layout for all dashboard routes
// Uses role-aware sidebar navigation

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SidebarLayout } from '@/components/layouts/app-sidebar';
import { Breadcrumbs } from '@/components/layouts/breadcrumbs';
import { type UserRole } from '@/lib/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentUser();

  if (!session) {
    redirect('/login');
  }

  const userRole = session.user.role as UserRole;
  const userName = session.user.name || session.user.email;

  return (
    <SidebarLayout userRole={userRole} userName={userName}>
      {/* Page Content with Breadcrumbs */}
      <div className="p-6">
        <Breadcrumbs role={userRole} className="mb-4" />
        {children}
      </div>
    </SidebarLayout>
  );
}

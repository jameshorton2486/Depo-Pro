// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD LAYOUT WITH SIDEBAR
// app/(dashboard)/layout-with-sidebar.tsx
//
// Alternative layout using the new role-aware sidebar navigation
// Copy this to layout.tsx when ready to switch
// ═══════════════════════════════════════════════════════════════════════════════

import { getCurrentUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { SidebarLayout } from '@/components/layouts/app-sidebar';
import { type UserRole } from '@/lib/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  const userRole = currentUser.role as UserRole;
  const userName = currentUser.name || currentUser.email;

  return (
    <SidebarLayout userRole={userRole} userName={userName}>
      <div className="p-6">
        {children}
      </div>
    </SidebarLayout>
  );
}

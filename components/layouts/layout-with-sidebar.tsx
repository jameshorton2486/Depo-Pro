// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD LAYOUT WITH SIDEBAR
// app/(dashboard)/layout-with-sidebar.tsx
//
// Alternative layout using the new role-aware sidebar navigation
// Copy this to layout.tsx when ready to switch
// ═══════════════════════════════════════════════════════════════════════════════

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SidebarLayout } from '@/components/layouts/app-sidebar';
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
      <div className="p-6">
        {children}
      </div>
    </SidebarLayout>
  );
}

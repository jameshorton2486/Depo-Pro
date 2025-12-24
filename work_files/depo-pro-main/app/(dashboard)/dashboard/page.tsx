// ═══════════════════════════════════════════════════════════════
// DASHBOARD ROUTER
// ═══════════════════════════════════════════════════════════════
// Redirects users to their role-specific dashboard

import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@/lib/constants';

export default async function DashboardPage() {
  const session = await getCurrentUser();

  if (!session) {
    redirect('/login');
  }

  // Redirect to role-specific dashboard
  switch (session.user.role) {
    case Role.ADMIN:
      redirect('/admin');
    case Role.COURT_REPORTER:
      redirect('/reporter');
    case Role.SCOPIST:
      redirect('/scopist');
    default:
      redirect('/login');
  }
}

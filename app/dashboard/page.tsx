// =============================================================================
// DASHBOARD ROUTER
// app/dashboard/page.tsx
//
// Redirects to role-specific dashboard
// =============================================================================

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/unauthorized?reason=missing_role');
  }

  const role = currentUser.role;

  // Redirect based on role
  // Routes are defined in app/(dashboard)/ which creates routes WITHOUT /dashboard prefix
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      redirect('/admin');
      break;
    case 'REPORTER':
      redirect('/reporter');
      break;
    case 'SCOPIST':
      redirect('/scopist');
      break;
    case 'ATTORNEY':
      redirect('/attorney-dashboard');
      break;
    default:
      redirect('/reporter');
  }
}

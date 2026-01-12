// =============================================================================
// DASHBOARD ROUTER
// app/dashboard/page.tsx
//
// Redirects to role-specific dashboard
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role;

  // Redirect based on role
  // Routes are defined in app/(dashboard)/ which creates routes WITHOUT /dashboard prefix
  switch (role) {
    case 'ADMIN':
      redirect('/admin');
      break;
    case 'REPORTER':
      redirect('/reporter');  // Fixed: was /dashboard/reporter
      break;
    case 'SCOPIST':
      redirect('/scopist');   // Fixed: was /dashboard/scopist
      break;
    case 'ATTORNEY':
      redirect('/attorney-dashboard');  // This route exists in app/(attorney)/
      break;
    default:
      // Default to reporter dashboard for unknown roles
      redirect('/reporter');  // Fixed: was /dashboard/reporter
  }
}

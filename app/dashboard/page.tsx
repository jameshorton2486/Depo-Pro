// =============================================================================
// DASHBOARD ROUTER
// app/dashboard/page.tsx
//
// Redirects to role-specific dashboard
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role;

  // Redirect based on role
  if (role === 'ADMIN') {
    redirect('/admin');
  } else if (role === 'REPORTER') {
    redirect('/dashboard/reporter');
  } else if (role === 'SCOPIST') {
    redirect('/dashboard/scopist');
  } else if (role === 'ATTORNEY') {
    redirect('/attorney-dashboard');
  } else {
    // Default to reporter dashboard
    redirect('/dashboard/reporter');
  }
}

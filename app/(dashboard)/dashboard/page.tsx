import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth-options';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  switch (session.user.role) {
    case 'ADMIN':
      redirect('/admin');
    case 'REPORTER':
      redirect('/reporter');
    case 'SCOPIST':
      redirect('/scopist');
    default:
      redirect('/jobs');
  }
}

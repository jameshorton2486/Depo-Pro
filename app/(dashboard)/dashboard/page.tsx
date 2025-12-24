import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();

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
    case 'ATTORNEY':
      redirect('/attorney/dashboard');
    default:
      redirect('/jobs');
  }
}

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
      break;
    case 'REPORTER':
      redirect('/reporter');
      break;
    case 'SCOPIST':
      redirect('/scopist');
      break;
    case 'ATTORNEY':
      redirect('/attorney/attorney-dashboard');
      break;
    default:
      redirect('/jobs');
      break;
  }
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { HealthDashboard } from '@/components/admin/health-dashboard';
import { ActionConsole } from '@/components/admin/action-console';

export const dynamic = 'force-dynamic';

export default async function AdminSystemPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }
  if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 py-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">System Administration</h1>
        <p className="text-sm text-muted-foreground">
          Health monitoring and privileged action tracking for the platform.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">System Health</h2>
        <HealthDashboard />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Admin Actions</h2>
        <ActionConsole />
      </section>

      <div className="text-sm text-muted-foreground">
        Additional system APIs: <code>/api/admin/health</code>, <code>/api/admin/metrics</code>,{' '}
        <code>/api/admin/incidents</code>.
        {' '}
        <Link href="/admin" className="text-primary underline-offset-4 hover:underline">
          Return to Admin Dashboard
        </Link>
      </div>
    </div>
  );
}

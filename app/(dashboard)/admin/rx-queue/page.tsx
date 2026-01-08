// app/(dashboard)/admin/rx-queue/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-compat';
import { RxQueueManager } from '@/components/billing/rx-queue-manager';

export default async function RxQueuePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string };

  if (user.role !== 'ADMIN' && user.role !== 'REPORTER') {
    redirect('/dashboard');
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Manual RX Queue
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manage forensic audio enhancement jobs requiring manual processing
        </p>
      </div>

      {/* RX Queue Manager */}
      <RxQueueManager />
    </div>
  );
}

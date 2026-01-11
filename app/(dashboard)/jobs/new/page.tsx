// ═══════════════════════════════════════════════════════════════
// NEW JOB PAGE
// ═══════════════════════════════════════════════════════════════

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { JobForm } from '@/components/jobs/job-form';

export const dynamic = 'force-dynamic';

export default async function NewJobPage() {
  const session = await getCurrentUser();

  if (!session) {
    redirect('/login');
  }

  // Scopists cannot create jobs
  if (session.role === 'SCOPIST') {
    redirect('/dashboard');
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Job</h1>
        <p className="text-muted-foreground mt-1">
          Add a new deposition or transcription job
        </p>
      </div>

      <JobForm mode="create" />
    </div>
  );
}

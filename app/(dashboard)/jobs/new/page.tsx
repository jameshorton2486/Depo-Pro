// ═══════════════════════════════════════════════════════════════
// NEW JOB PAGE
// ═══════════════════════════════════════════════════════════════

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { JobRequestWizard } from '@/components/intake/JobRequestWizard';

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
    <div className="container max-w-5xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Transcript Intake</h1>
        <p className="text-muted-foreground mt-1">
          Upload a notice, review extracted data, and create a job or submit a request.
        </p>
      </div>

      <JobRequestWizard role={session.role} />
    </div>
  );
}

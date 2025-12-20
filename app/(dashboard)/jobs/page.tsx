// ═══════════════════════════════════════════════════════════════
// JOBS LIST PAGE
// ═══════════════════════════════════════════════════════════════

import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default async function JobsPage() {
  const session = await getCurrentUser();

  if (!session || !session.user) {
    redirect('/login');
  }

  const user = session.user;

  // Scopists cannot create jobs
  const canCreateJobs = user.role !== 'SCOPIST';

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground mt-1">
            Manage depositions and transcription jobs
          </p>
        </div>
        {canCreateJobs && (
          <Link href="/jobs/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          </Link>
        )}
      </div>

      <Suspense fallback={<JobsListSkeleton />}>
        <JobsList />
      </Suspense>
    </div>
  );
}

async function JobsList() {
  const session = await getCurrentUser();

  if (!session || !session.user) {
    return null;
  }

  // In a real implementation, this would fetch from the API
  // For now, we'll show a placeholder
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="col-span-full text-center py-12 text-muted-foreground">
        <p>Job list will be loaded here via API call</p>
        <p className="text-sm mt-2">This requires client-side data fetching implementation</p>
      </div>
    </div>
  );
}

function JobsListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-lg" />
      ))}
    </div>
  );
}

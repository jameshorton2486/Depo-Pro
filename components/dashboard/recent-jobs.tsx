// ═══════════════════════════════════════════════════════════════
// RECENT JOBS COMPONENT
// ═══════════════════════════════════════════════════════════════
// Reusable job list display

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { JOB_STATUS_COLORS, JOB_STATUS_LABELS } from '@/lib/constants';
import { Job } from '@prisma/client';

interface RecentJobsProps {
  jobs: Job[];
  emptyMessage?: string;
  showCreateButton?: boolean;
}

export function RecentJobs({ 
  jobs, 
  emptyMessage = 'No jobs found',
  showCreateButton = false 
}: RecentJobsProps) {
  if (jobs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-4">{emptyMessage}</p>
        {showCreateButton && (
          <Button asChild>
            <Link href="/jobs/new">Create New Job</Link>
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <Card key={job.id} className="p-4 hover:shadow-md transition-shadow">
          <Link href={`/jobs/${job.id}`}>
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    {job.caseNumber || 'No Case #'}
                  </h3>
                  <span 
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      JOB_STATUS_COLORS[job.status]
                    }`}
                  >
                    {JOB_STATUS_LABELS[job.status]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {job.caseName}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                  {job.depositionDate && (
                    <span>📅 {formatDate(job.depositionDate)}</span>
                  )}
                  <span>🏛 {job.location || 'TBD'}</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground text-right">
                <p>Created {formatDate(job.createdAt)}</p>
              </div>
            </div>
          </Link>
        </Card>
      ))}
      <div className="text-center pt-4">
        <Button asChild variant="outline">
          <Link href="/jobs">View All Jobs</Link>
        </Button>
      </div>
    </div>
  );
}

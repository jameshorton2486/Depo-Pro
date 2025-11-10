// ═══════════════════════════════════════════════════════════════
// JOB CARD COMPONENT
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Job, User, Firm } from '@prisma/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { JobStatusBadge } from './job-status-badge';
import { Calendar, MapPin, User as UserIcon, Building2, FileText, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type JobWithRelations = Job & {
  reporter: Pick<User, 'id' | 'name' | 'email'>;
  firm: Pick<Firm, 'id' | 'name'> | null;
  _count?: {
    files: number;
    transcripts: number;
  };
};

interface JobCardProps {
  job: JobWithRelations;
}

export function JobCard({ job }: JobCardProps) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <Card className="hover:border-blue-400 transition-colors cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                {job.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {job.caseName}
              </p>
            </div>
            <JobStatusBadge status={job.status} />
          </div>
          {job.rushOrder && (
            <div className="flex items-center gap-1 text-red-600 text-sm mt-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Rush Order</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(job.depoDate)}</span>
            </div>
            
            {job.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{job.location.split(',')[0]}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserIcon className="h-4 w-4" />
            <span>{job.reporter.name}</span>
          </div>

          {job.firm && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{job.firm.name}</span>
            </div>
          )}

          {job._count && (
            <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground border-t">
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>{job._count.files} files</span>
              </div>
              {job.totalPages && (
                <div>
                  <span>{job.totalPages} pages</span>
                </div>
              )}
            </div>
          )}

          {job.caseNumber && (
            <div className="text-xs text-muted-foreground pt-1">
              Case #{job.caseNumber}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

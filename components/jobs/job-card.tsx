// ═══════════════════════════════════════════════════════════════
// JOB CARD COMPONENT
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { Job, User } from '@prisma/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { JobStatusBadge } from './job-status-badge';
import { Calendar, MapPin, User as UserIcon, FileText, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type JobWithRelations = Job & {
  createdBy: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
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
                {job.caseName || job.caseNumber || 'Untitled Job'}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {job.title}
              </p>
            </div>
            <JobStatusBadge status={job.status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(job.depositionDate)}</span>
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
            <span>{job.createdBy.firstName} {job.createdBy.lastName}</span>
          </div>

          {job._count && (
            <div className="flex items-center gap-4 pt-2 text-sm text-muted-foreground border-t">
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>{job._count.files} files</span>
              </div>
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

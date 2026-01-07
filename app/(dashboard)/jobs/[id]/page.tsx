// ═══════════════════════════════════════════════════════════════
// JOB DETAIL PAGE
// ═══════════════════════════════════════════════════════════════

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { AssignmentManagement } from '@/components/jobs/assignment-management';
import { FileUpload } from '@/components/jobs/file-upload';
import { ExhibitsManager } from '@/components/jobs/exhibits-manager';
import { ReporterProperNounsPanel } from '@/components/notes/reporter-proper-nouns-panel';
import { LiveNotesCapture } from '@/components/jobs/live-notes-capture';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import {
  Calendar,
  MapPin,
  User,
  Edit,
  Trash2,
} from 'lucide-react';

interface JobDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const session = await getCurrentUser();

  if (!session || !session.user) {
    redirect('/login');
  }

  const { id } = await params;

  // Fetch available scopists for assignment
  const availableScopists = await db.user.findMany({
    where: {
      role: 'SCOPIST',
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  const job = await db.job.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      files: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      transcriptionJobs: true,
      assignments: {
        include: {
          scopist: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!job) {
    notFound();
  }

  // 🔒 Security: Verify access rights
  const hasAccess =
    session.user.role === 'ADMIN' ||
    job.createdById === session.user.id ||
    job.assignments.some((a: any) => a.scopistId === session.user.id);

  if (!hasAccess) {
    redirect('/dashboard');
  }

  const canEdit =
    session.user.role === 'ADMIN' ||
    job.createdById === session.user.id;

  const canAssign = canEdit;

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{job.title || job.caseName || 'Untitled Job'}</h1>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="text-lg text-muted-foreground">{job.caseName}</p>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <Link href={`/jobs/${job.id}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button variant="outline" className="text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Case Information */}
        <Card>
          <CardHeader>
            <CardTitle>Case Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {job.caseNumber && (
              <div>
                <p className="text-sm text-muted-foreground">Case Number</p>
                <p className="font-medium">{job.caseNumber}</p>
              </div>
            )}
            {job.location && (
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{job.location}</p>
                </div>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Deposition Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{job.depositionDate ? formatDate(job.depositionDate, true) : 'TBD'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Details */}
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Created By</p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{job.createdBy.firstName} {job.createdBy.lastName}</p>
              </div>
            </div>
            {job.zoomLink && (
              <div>
                <p className="text-sm text-muted-foreground">Zoom Link</p>
                <a href={job.zoomLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {job.zoomLink}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* File Upload */}
      <FileUpload
        jobId={job.id}
        files={job.files.map((file: any) => ({
          id: file.id,
          filename: file.fileName,
          originalName: file.fileName,
          mimeType: file.mimeType,
          size: file.fileSize,
          fileType: file.type,
          createdAt: file.createdAt,
          uploadedBy: {
            id: job.createdById, // Fallback since we don't track uploader per file
            name: 'System',
            email: '',
          },
        }))}
        canUpload={canEdit}
        canDelete={canEdit}
      />

      {/* Exhibits */}
      <ExhibitsManager jobId={job.id} canEdit={canEdit} />

      {/* Assignments */}
      <AssignmentManagement
        jobId={job.id}
        assignments={job.assignments}
        availableScopists={availableScopists}
        canAssign={canAssign}
        currentUserId={session.user.id}
      />

      {/* Live Notes Capture (Reporter Only) */}
      {(session.user.role === 'REPORTER' || session.user.role === 'ADMIN') && (
        <div className="mt-6">
          <LiveNotesCapture jobId={job.id} />
        </div>
      )}

      {/* Proper Nouns & Spellings (Reporter Only) */}
      {(session.user.role === 'REPORTER' || session.user.role === 'ADMIN') && (
        <div className="mt-6">
          <ReporterProperNounsPanel
            jobId={job.id}
            disabled={job.status === 'COMPLETED' || job.status === 'REVIEW_COMPLETE'}
          />
        </div>
      )}

      {/* Live Deposition Notes (Legacy - can be removed if not needed) */}
      {/* {(session.user.role === 'REPORTER' || session.user.role === 'ADMIN') ? (
        <div className="mt-6">
          <DepositionNotesPanel
            jobId={job.id}
            userRole={session.user.role as 'REPORTER' | 'ADMIN'}
            userId={session.user.id}
            className="h-[500px]"
          />
        </div>
      ) : session.user.role === 'SCOPIST' ? (
        <div className="mt-6">
          <ScopistNotesView
            jobId={job.id}
            className="h-[400px]"
          />
        </div>
      ) : null} */}

      {/* Legacy Notes (keep for backward compatibility) */}
      {job.notes && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>General Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{job.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

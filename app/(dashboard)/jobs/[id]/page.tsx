// Migrated from Prisma to Supabase queries — PASS 2A
// ═══════════════════════════════════════════════════════════════
// JOB DETAIL PAGE
// ═══════════════════════════════════════════════════════════════

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { getUsersByRole } from '@/lib/supabase/queries/users';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { AssignmentManagement } from '@/components/jobs/assignment-management';
import { FileUpload } from '@/components/jobs/file-upload';
import { ExhibitsManager } from '@/components/jobs/exhibits-manager';
import { ReporterProperNounsPanel } from '@/components/notes/reporter-proper-nouns-panel';
import { LiveNotesCapture } from '@/components/jobs/live-notes-capture';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import FormatSettingsPanel from '@/components/transcripts/FormatSettingsPanel';
import {
  Calendar,
  MapPin,
  User,
  Edit,
  Trash2,
  FileText,
} from 'lucide-react';
import { isAdminRole } from '@/lib/admin';

export const dynamic = 'force-dynamic';

interface JobDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const session = await getCurrentUser();

  if (!session) {
    redirect('/login');
  }

  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // Fetch available scopists for assignment
  const scopistUsers = await getUsersByRole(supabase, 'SCOPIST');
  const availableScopists = scopistUsers.map((user: any) => ({
    id: user.id,
    firstName: user.user_metadata?.firstName || '',
    lastName: user.user_metadata?.lastName || '',
    email: user.email || '',
  }));

  // Fetch job with all includes
  const job = await getJobById(supabase, id, {
    includeCreatedBy: true,
    includeFiles: true,
    includeAssignments: true,
    includeTranscripts: true,
  });

  if (!job) {
    notFound();
  }

  const { data: transcription } = await supabase
    .from('transcriptions')
    .select('segments')
    .eq('job_id', id)
    .single();

  const detectedSpeakers = Array.from(
    new Set(
      ((transcription?.segments as Array<{ speaker?: number }> | null) || [])
        .filter((segment) => typeof segment?.speaker === 'number')
        .map((segment) => `Speaker ${segment.speaker}`),
    ),
  );

  // 🔒 Security: Verify access rights
  const hasAccess =
    isAdminRole(session.role) ||
    job.reporter_id === session.id ||
    job.assignments.some((a: any) => a.scopist_id === session.id);

  if (!hasAccess) {
    redirect('/dashboard');
  }

  const canEdit =
    isAdminRole(session.role) ||
    job.reporter_id === session.id;

  const canAssign = canEdit;

  return (
    <ErrorBoundary pageName="job-detail-page">
      <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{job.title || job.case_name || 'Untitled Job'}</h1>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="text-lg text-muted-foreground">{job.case_name}</p>
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
            {job.case_number && (
              <div>
                <p className="text-sm text-muted-foreground">Case Number</p>
                <p className="font-medium">{job.case_number}</p>
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
                <p className="font-medium">{job.deposition_date ? formatDate(new Date(job.deposition_date), true) : 'TBD'}</p>
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
        files={(job.files || []).map((file: any) => ({
          id: file.id,
          filename: file.file_name || file.filename,
          originalName: file.file_name || file.filename,
          mimeType: file.mime_type || file.mimeType,
          size: file.file_size || file.size,
          fileType: file.type,
          createdAt: file.created_at || file.createdAt,
          uploadedBy: {
            id: job.created_by_id, // Fallback since we don't track uploader per file
            name: 'System',
            email: '',
          },
        }))}
        canUpload={canEdit}
        canDelete={canEdit}
      />

      {/* Exhibits */}
      <ExhibitsManager jobId={job.id} canEdit={canEdit} />

      {/* Medical Chronology */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Medical Chronology
            </CardTitle>
            <Link href={`/jobs/${job.id}/medical`}>
              <Button variant="outline" size="sm">
                Open Chronology
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Upload medical records and generate an AI-powered chronology
            of dated medical events for this case.
          </p>
        </CardContent>
      </Card>

      {/* Assignments */}
      <AssignmentManagement
        jobId={job.id}
        assignments={job.assignments || []}
        availableScopists={availableScopists}
        canAssign={canAssign}
        currentUserId={session.id}
      />

      {/* Live Notes Capture (Reporter Only) */}
      {(session.role === 'REPORTER' || isAdminRole(session.role)) && (
        <div className="mt-6">
          <LiveNotesCapture jobId={job.id} />
        </div>
      )}

      {/* Proper Nouns & Spellings (Reporter Only) */}
      {(session.role === 'REPORTER' || isAdminRole(session.role)) && (
        <div className="mt-6">
          <ReporterProperNounsPanel
            jobId={job.id}
            disabled={job.status === 'COMPLETED' || job.status === 'REVIEW_COMPLETE'}
          />
        </div>
      )}

      {job.status !== 'PENDING' &&
        job.status !== 'PROCESSING' &&
        job.status !== 'TRANSCRIBING' &&
        detectedSpeakers.length > 0 && (
          <div className="mt-6">
            <FormatSettingsPanel
              jobId={job.id}
              detectedSpeakers={detectedSpeakers}
            />
          </div>
        )}

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
    </ErrorBoundary>
  );
}

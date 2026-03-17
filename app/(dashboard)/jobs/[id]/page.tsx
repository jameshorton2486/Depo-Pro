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
  FileText,
} from 'lucide-react';
import { isAdminRole } from '@/lib/admin';
import { DeliverTranscriptButton } from '@/components/jobs/DeliverTranscriptButton';
import { GenerateInvoiceButton } from '@/components/jobs/GenerateInvoiceButton';
import { JobAudioSection } from '@/components/jobs/job-audio-section';
import { StartTranscriptionButton } from '@/components/jobs/StartTranscriptionButton';
import { DeleteJobButton } from '@/components/jobs/delete-job-button';

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

  const [{ data: transcription }, { data: jobFiles }] = await Promise.all([
    supabase
      .from('transcriptions')
      .select('id, segments, metadata, status')
      .eq('job_id', id)
      .single(),
    supabase
      .from('job_files')
      .select('*')
      .eq('job_id', id)
      .order('created_at', { ascending: false }),
  ]);

  const audioQuality = transcription?.metadata as {
    audio_quality_score?: number;
    audio_quality_tier?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNUSABLE';
    audio_quality_issues?: string[];
  } | null;

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
            <DeleteJobButton
              jobId={job.id}
              jobTitle={job.title || job.case_name || 'Untitled Job'}
              variant="button"
            />
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
                <p className="text-sm text-muted-foreground">Cause Number</p>
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
                <p className="font-medium">{job.createdBy?.full_name ?? 'Unknown'}</p>
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

      {/* Audio Quality Badge */}
      {audioQuality?.audio_quality_tier && (
        <div className={`mt-6 rounded-lg border p-4 ${
          audioQuality.audio_quality_tier === 'EXCELLENT' ? 'border-emerald-200 bg-emerald-50' :
          audioQuality.audio_quality_tier === 'GOOD'      ? 'border-green-200 bg-green-50' :
          audioQuality.audio_quality_tier === 'FAIR'      ? 'border-yellow-200 bg-yellow-50' :
          audioQuality.audio_quality_tier === 'POOR'      ? 'border-orange-200 bg-orange-50' :
                                                            'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${
              audioQuality.audio_quality_tier === 'EXCELLENT' ? 'text-emerald-700' :
              audioQuality.audio_quality_tier === 'GOOD'      ? 'text-green-700' :
              audioQuality.audio_quality_tier === 'FAIR'      ? 'text-yellow-700' :
              audioQuality.audio_quality_tier === 'POOR'      ? 'text-orange-700' :
                                                                'text-red-700'
            }`}>
              Audio Quality: {audioQuality.audio_quality_tier}
              {audioQuality.audio_quality_score !== undefined && (
                <span className="ml-1 font-normal">
                  ({audioQuality.audio_quality_score}/100)
                </span>
              )}
            </span>
          </div>
          {audioQuality.audio_quality_issues && audioQuality.audio_quality_issues.length > 0 && (
            <ul className="mt-2 space-y-1">
              {audioQuality.audio_quality_issues.map((issue, i) => (
                <li key={i} className="text-xs text-slate-600">• {issue}</li>
              ))}
            </ul>
          )}
          {(audioQuality.audio_quality_tier === 'POOR' || audioQuality.audio_quality_tier === 'UNUSABLE') && (
            <p className="mt-2 text-xs text-slate-500">
              Recommendation: Run <code className="font-mono bg-white px-1 rounded">scripts/audio/enhance.py</code> on this file before re-uploading.
            </p>
          )}
        </div>
      )}

      {/* Audio Recording */}
      <JobAudioSection
        jobId={job.id}
        jobTitle={(job as any).title ?? 'This Deposition'}
        audioFileUrl={(job as any).audio_file_url ?? null}
      />

      {/* Start Transcription — when audio exists and not already transcribing */}
      {canEdit &&
        (job.status === 'DRAFT' ||
          job.status === 'CREATED' ||
          job.status === 'PENDING' ||
          job.status === 'FILES_UPLOADED' ||
          job.status === 'FAILED') &&
        ((job as any).audio_file_url ||
          (jobFiles || []).some(
            (f: any) =>
              f.type === 'AUDIO' ||
              f.mime_type?.startsWith('audio/') ||
              f.mime_type?.startsWith('video/'),
          )) && (
          <div className="mt-4">
            <StartTranscriptionButton jobId={job.id} />
          </div>
        )}

      {/* File Upload */}
      <FileUpload
        jobId={job.id}
        files={(jobFiles || []).map((file: any) => ({
          id: file.id,
          filename: file.file_name,
          originalName: file.file_name,
          mimeType: file.mime_type,
          size: file.file_size,
          fileType: file.type,
          createdAt: file.created_at,
          uploadedBy: {
            id: file.uploaded_by_id || job.created_by_id,
            name: 'Uploader',
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

      {/* Deliver Transcript — shown when ready for delivery */}
      {(job.status === 'REVIEW_COMPLETE' || job.status === 'SCOPIST_COMPLETE') &&
       canEdit && (
        <div className="mt-6">
          <DeliverTranscriptButton
            jobId={job.id}
            transcriptId={transcription?.id || ''}
            orderingEmail={(job as any).ordering_email || ''}
            orderingName={(job as any).ordering_attorney || 'Ordering Attorney'}
            depositionLabel={`${job.deponent_name || job.title} (${job.case_number || 'No cause number'})`}
          />
        </div>
      )}

      {/* Generate Invoice — shown after delivery */}
      {job.status === 'COMPLETED' && canEdit && (
        <div className="mt-3">
          <GenerateInvoiceButton jobId={job.id} />
        </div>
      )}

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

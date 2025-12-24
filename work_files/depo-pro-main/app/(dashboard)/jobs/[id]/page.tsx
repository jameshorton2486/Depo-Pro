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
import { DictionaryManagement } from '@/components/jobs/dictionary-management';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { 
  Calendar, 
  MapPin, 
  Building2, 
  User, 
  AlertCircle,
  Edit,
  Trash2
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

  const job = await db.job.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      firm: {
        select: {
          id: true,
          name: true,
        },
      },
      files: {
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      transcription: true,
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      dictionaryTerms: true,
    },
  });

  if (!job) {
    notFound();
  }

  // 🔒 Security: Verify access rights
  const hasAccess =
    session.user.role === 'ADMIN' ||
    job.createdById === session.user.id ||
    (session.user.firmId && job.firmId === session.user.firmId) ||
    job.assignments.some((a) => a.userId === session.user.id);

  if (!hasAccess) {
    redirect('/dashboard');
  }

  const canEdit = 
    session.user.role === 'ADMIN' || 
    job.reporterId === session.user.id;

  const canAssign = canEdit;

  // Fetch available scopists for assignment
  const availableScopists = canAssign
    ? await db.user.findMany({
        where: {
          role: 'SCOPIST',
          firmId: job.firmId,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: {
          name: 'asc',
        },
      })
    : [];

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{job.caseName || job.caseNumber || 'Untitled Job'}</h1>
            <JobStatusBadge status={job.status} />
            {job.needsReview && (
              <div className="flex items-center gap-1 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Needs Review</span>
              </div>
            )}
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
            {job.court && (
              <div>
                <p className="text-sm text-muted-foreground">Court</p>
                <p className="font-medium">{job.court}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Deposition Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{job.depositionDate ? formatDate(job.depositionDate, true) : 'TBD'}</p>
              </div>
            </div>
            {job.courtName && (
              <div>
                <p className="text-sm text-muted-foreground">Court</p>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{job.courtName}</p>
                </div>
              </div>
            )}
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
                <p className="font-medium">{job.createdBy.name}</p>
              </div>
            </div>
            {job.firm && (
              <div>
                <p className="text-sm text-muted-foreground">Firm</p>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{job.firm.name}</p>
                </div>
              </div>
            )}
            {job.estimatedDuration && (
              <div>
                <p className="text-sm text-muted-foreground">Estimated Duration</p>
                <p className="font-medium">{Math.round(job.estimatedDuration / 60)} minutes</p>
              </div>
            )}
            {job.overallConfidence && (
              <div>
                <p className="text-sm text-muted-foreground">AI Confidence</p>
                <p className="font-medium">{Math.round(job.overallConfidence * 100)}%</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Case Information */}
        {(job.caseNumber || job.caseName) && (
          <Card>
            <CardHeader>
              <CardTitle>Case Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {job.clientName && (
                <div>
                  <p className="text-sm text-muted-foreground">Client Name</p>
                  <p className="font-medium">{job.clientName}</p>
                </div>
              )}
              {job.clientContact && (
                <div>
                  <p className="text-sm text-muted-foreground">Client Contact</p>
                  <p className="font-medium">{job.clientContact}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* File Upload */}
      <FileUpload
        jobId={job.id}
        files={job.files.map((file: any) => ({
          id: file.id,
          filename: file.originalFileName,
          originalName: file.originalFileName,
          mimeType: file.mimeType,
          size: file.originalFileSize,
          fileType: file.fileType,
          createdAt: file.createdAt,
          uploadedBy: {
            id: file.createdBy.id,
            name: file.createdBy.name,
            email: file.createdBy.email,
          },
        }))}
        canUpload={canEdit}
        canDelete={canEdit}
      />

      {/* Assignments */}
      <AssignmentManagement
        jobId={job.id}
        assignments={job.assignments}
        availableScopists={availableScopists}
        canAssign={canAssign}
        currentUserId={session.user.id}
      />

      {/* Dictionary */}
      <DictionaryManagement
        jobId={job.id}
        terms={job.dictionaryTerms as any[]}
        canAdd={canEdit || job.assignments.some((a: any) => a.userId === session.user.id)}
        canEdit={canEdit || job.assignments.some((a: any) => a.userId === session.user.id)}
      />

      {/* Notes */}
      {job.notes && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{job.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

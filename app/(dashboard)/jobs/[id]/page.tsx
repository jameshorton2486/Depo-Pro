// ═══════════════════════════════════════════════════════════════
// JOB DETAIL PAGE
// ═══════════════════════════════════════════════════════════════

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { AssignmentManagement } from '@/components/jobs/assignment-management';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { 
  Calendar, 
  MapPin, 
  Building2, 
  FileText, 
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
      reporter: {
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
      assignments: {
        include: {
          scopist: {
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
      files: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      transcripts: {
        where: {
          isCurrent: true,
        },
        orderBy: {
          version: 'desc',
        },
      },
      dictionaryTerms: {
        orderBy: {
          term: 'asc',
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
    job.reporterId === session.user.id ||
    (session.user.firmId && job.firmId === session.user.firmId) ||
    job.assignments.some((a) => a.scopistId === session.user.id);

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
            <h1 className="text-3xl font-bold">{job.title}</h1>
            <JobStatusBadge status={job.status} />
            {job.rushOrder && (
              <div className="flex items-center gap-1 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Rush</span>
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
                <p className="font-medium">{formatDate(job.depoDate, true)}</p>
              </div>
            </div>
            {job.location && (
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{job.location}</p>
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
              <p className="text-sm text-muted-foreground">Reporter</p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{job.reporter.name}</p>
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
            {job.totalPages && (
              <div>
                <p className="text-sm text-muted-foreground">Total Pages</p>
                <p className="font-medium">{job.totalPages} pages</p>
              </div>
            )}
            {job.difficulty && (
              <div>
                <p className="text-sm text-muted-foreground">Difficulty</p>
                <p className="font-medium">{job.difficulty} / 5</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Information */}
        {(job.clientName || job.clientContact) && (
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
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

        {/* Files */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Files ({job.files.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {job.files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files uploaded yet</p>
            ) : (
              <ul className="space-y-2">
                {job.files.map((file) => (
                  <li key={file.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{file.originalName}</span>
                      <span className="text-muted-foreground">{file.fileType}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assignments */}
      <AssignmentManagement
        jobId={job.id}
        assignments={job.assignments}
        availableScopists={availableScopists}
        canAssign={canAssign}
        currentUserId={session.user.id}
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

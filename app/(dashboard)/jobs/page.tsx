// ═══════════════════════════════════════════════════════════════
// JOBS LIST PAGE
// ═══════════════════════════════════════════════════════════════

import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { Plus, Search, Calendar, FileText, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface JobsPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const session = await getCurrentUser();

  if (!session || !session.user) {
    redirect('/login');
  }

  const user = session.user;

  // Scopists cannot create jobs
  const canCreateJobs = user.role !== 'SCOPIST';

  const params = await searchParams;
  const status = params.status as string | undefined;
  const search = params.search || '';
  const page = parseInt(params.page || '1');

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Jobs</h1>
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

      {/* Filters */}
      <form method="get" className="mb-6 flex gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">
            Search jobs
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search jobs by title, case name, or case number..."
              className="pl-10"
              defaultValue={search}
              name="search"
            />
          </div>
        </div>
        <label htmlFor="status" className="sr-only">
          Filter by status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={status || ''}
          className="px-3 py-2 border rounded-md bg-background"
          title="Filter by job status"
        >
          <option value="">All Statuses</option>
          <option value="CREATED">Created</option>
          <option value="FILES_UPLOADED">Files Uploaded</option>
          <option value="TRANSCRIBING">Transcribing</option>
          <option value="AI_REVIEWING">AI Reviewing</option>
          <option value="READY_FOR_EDIT">Ready for Edit</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_EDIT">In Edit</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <Button type="submit">Apply Filters</Button>
      </form>

      <Suspense fallback={<JobsListSkeleton />}>
        <JobsList user={user} status={status} search={search} page={page} />
      </Suspense>
    </div>
  );
}

async function JobsList({
  user,
  status,
  search,
  page,
}: {
  user: { id: string; role: string };
  status?: string;
  search?: string;
  page: number;
}) {
  // Build where clause based on role
  const where: Record<string, unknown> = {};

  if (user.role === 'REPORTER') {
    where.createdById = user.id;
  } else if (user.role === 'SCOPIST') {
    where.assignments = {
      some: {
        scopistId: user.id,
      },
    };
  }

  // Add filters
  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { caseName: { contains: search, mode: 'insensitive' } },
      { caseNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  const limit = 20;
  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    db.job.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignments: {
          include: {
            scopist: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            files: true,
            transcripts: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      skip,
      take: limit,
    }),
    db.job.count({ where }),
  ]);

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
          <p className="text-muted-foreground mb-4">
            {search || status
              ? 'Try adjusting your filters to see more results.'
              : user.role === 'REPORTER'
                ? 'Get started by creating your first job.'
                : 'No jobs have been assigned to you yet.'}
          </p>
          {user.role !== 'SCOPIST' && (
            <Link href="/jobs/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Job
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <Link key={job.id} href={`/jobs/${job.id}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{job.title || job.caseName || 'Untitled Job'}</CardTitle>
                  <JobStatusBadge status={job.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.caseName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="truncate">{job.caseName}</span>
                  </div>
                )}
                {job.caseNumber && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Case #{job.caseNumber}</span>
                  </div>
                )}
                {job.depositionDate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(job.depositionDate, true)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Updated {formatDistanceToNow(new Date(job.updatedAt), { addSuffix: true })}</span>
                </div>
                <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
                  <span>{job._count.files} file{job._count.files !== 1 ? 's' : ''}</span>
                  {job.assignments.length > 0 && (
                    <span>{job.assignments.length} scopist{job.assignments.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {page > 1 && (
            <Link href={`/jobs?page=${page - 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}>
              <Button variant="outline">Previous</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / limit)}
          </span>
          {page < Math.ceil(total / limit) && (
            <Link href={`/jobs?page=${page + 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}>
              <Button variant="outline">Next</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function JobsListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="h-64">
          <CardHeader>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-4/6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

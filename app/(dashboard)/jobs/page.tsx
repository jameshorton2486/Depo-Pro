// ═══════════════════════════════════════════════════════════════
// JOBS LIST PAGE
// ═══════════════════════════════════════════════════════════════

import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JobStatusBadge } from '@/components/jobs/job-status-badge';
import { RiskScoreBadge } from '@/components/jobs/risk-score-badge';
import { RiskOverviewWidget, calculateRiskOverview } from '@/components/jobs/risk-overview-widget';
import { EffortBadge } from '@/components/jobs/effort-badge';
import { estimateReviewEffort, calculateTotalEffort } from '@/lib/services/effort-estimate';
import { Plus, Search, Calendar, FileText, Clock, AlertTriangle, ListChecks } from 'lucide-react';
import { DeleteJobButton } from '@/components/jobs/delete-job-button';
import { isAdminRole } from '@/lib/admin';
import { formatDate } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

interface JobsPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
    sort?: string;
  }>;
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const session = await getCurrentUser();

  if (!session) {
    redirect('/login');
  }

  // Scopists cannot create jobs
  const canCreateJobs = session.role !== 'SCOPIST';

  const params = await searchParams;
  const status = params.status as string | undefined;
  const search = params.search || '';
  const page = parseInt(params.page || '1');
  const sort = params.sort || 'risk_desc'; // Feature 1: Risk is now the DEFAULT

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Depositions</h1>
          <p className="text-muted-foreground mt-1">
            Manage deposition jobs and transcripts
          </p>
        </div>
        {canCreateJobs && (
          <Link href="/jobs/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Deposition
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
              placeholder="Search jobs by title, case style, or cause number..."
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
          <option value="CREATED">Scheduled – Awaiting Deposition</option>
          <option value="FILES_UPLOADED">Recording Needed</option>
          <option value="TRANSCRIBING">Transcribing</option>
          <option value="AI_REVIEWING">AI Formatting</option>
          <option value="READY_FOR_EDIT">Ready for Proofing</option>
          <option value="ASSIGNED">Assigned to Scopist</option>
          <option value="IN_EDIT">In Proofing</option>
          <option value="SUBMITTED_FOR_REVIEW">Submitted for Reporter Review</option>
          <option value="IN_REVIEW">Reporter Review</option>
          <option value="REVIEW_COMPLETE">Pending Delivery</option>
          <option value="COMPLETED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <Button type="submit">Apply Filters</Button>
      </form>

      <Suspense fallback={<JobsListSkeleton />}>
        <JobsList user={session} status={status} search={search} page={page} sort={sort} />
      </Suspense>
    </div>
  );
}

async function JobsList({
  user,
  status,
  search,
  page,
  sort,
}: {
  user: { id: string; role: string; firm_id?: string };
  status?: string;
  search?: string;
  page: number;
  sort: string;
}) {
  const supabase = await createSupabaseServerClient();
  const limit = 20;
  const skip = (page - 1) * limit;

  // Build query based on role
  let jobsQuery = supabase
    .from('jobs')
    .select(`
      id,
      title,
      case_name,
      case_number,
      status,
      deposition_date,
      updated_at,
      created_by_id,
      scopist_id
    `, { count: 'exact' });

  // Role-based filtering
  if (user.role === 'SUPER_ADMIN') {
    // SUPER_ADMIN sees all jobs across all firms — no filter
    jobsQuery = jobsQuery.is('deleted_at', null);
  } else if (user.role === 'REPORTER' || user.role === 'COURT_REPORTER') {
    jobsQuery = jobsQuery.is('deleted_at', null).eq('created_by_id', user.id);
  } else if (user.role === 'SCOPIST') {
    // Scopist sees only jobs assigned to them via jobs.scopist_id
    jobsQuery = jobsQuery.eq('scopist_id', user.id);
  }

  // Status filter
  if (status) {
    jobsQuery = jobsQuery.eq('status', status);
  }

  // Search filter (Supabase text search)
  if (search) {
    jobsQuery = jobsQuery.or(`title.ilike.%${search}%,case_name.ilike.%${search}%,case_number.ilike.%${search}%`);
  }

  // Pagination and ordering
  // Note: Risk-based sorting requires client-side sort after fetching metadata
  if (sort === 'updated_at') {
    jobsQuery = jobsQuery.order('updated_at', { ascending: false });
  } else if (sort === 'status') {
    jobsQuery = jobsQuery.order('status', { ascending: true });
  } else {
    // Default to updated_at for initial fetch, then sort by risk client-side
    jobsQuery = jobsQuery.order('updated_at', { ascending: false });
  }

  jobsQuery = jobsQuery.range(skip, skip + limit - 1);

  const { data: jobsData, count: total, error } = await jobsQuery;

  if (error) {
    console.error('Jobs query error:', error);
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-red-500">Error loading jobs: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  // Get file counts and transcription metadata for each job
  const jobIds = jobsData?.map(j => j.id) || [];
  const [filesCounts, transcriptionData] = await Promise.all([
    jobIds.length > 0 ? supabase
      .from('job_files')
      .select('job_id')
      .in('job_id', jobIds) : Promise.resolve({ data: [] }),
    jobIds.length > 0 ? supabase
      .from('transcriptions')
      .select('job_id, metadata')
      .in('job_id', jobIds) : Promise.resolve({ data: [] }),
  ]);

  // Extract transcription metadata (risk scores) by job_id
  const transcriptionsByJobId: Record<string, any> = {};
  transcriptionData.data?.forEach((t: any) => {
    transcriptionsByJobId[t.job_id] = t;
  });

  // Get created_by user info (from Supabase Auth)
  const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = getSupabaseAdminClient();
  const createdByIds = [...new Set(jobsData?.map(j => j.created_by_id).filter(Boolean) || [])];
  const createdByUsers: Record<string, any> = {};

  for (const userId of createdByIds) {
    const { data: userData } = await adminClient.auth.admin.getUserById(userId);
    if (userData?.user) {
      createdByUsers[userId] = {
        id: userData.user.id,
        firstName: userData.user.user_metadata?.firstName || '',
        lastName: userData.user.user_metadata?.lastName || '',
        email: userData.user.email || '',
      };
    }
  }

  // Get scopist info from jobs.scopist_id
  const scopistIds = [...new Set(
    jobsData?.map(j => (j as any).scopist_id).filter(Boolean) || []
  )];
  const scopistUsers: Record<string, any> = {};

  for (const scopistId of scopistIds) {
    const { data: userData } = await adminClient.auth.admin.getUserById(scopistId);
    if (userData?.user) {
      scopistUsers[scopistId] = {
        id: userData.user.id,
        firstName: userData.user.user_metadata?.firstName || '',
        lastName: userData.user.user_metadata?.lastName || '',
      };
    }
  }

  // Transform to expected format
  const jobs = (jobsData || []).map((job: any) => {
    const fileCount = filesCounts.data?.filter((f: any) => f.job_id === job.id).length || 0;
    const transcriptCount = transcriptionData.data?.filter(t => t.job_id === job.id).length || 0;
    const transcription = transcriptionsByJobId[job.id];
    const riskScoreResult = transcription?.metadata?.risk_score_result;
    const confidenceAnalytics = transcription?.metadata?.confidence_analytics;

    return {
      id: job.id,
      title: job.title,
      caseName: job.case_name,
      caseNumber: job.case_number,
      status: job.status,
      depositionDate: job.deposition_date,
      updatedAt: job.updated_at,
      createdBy: createdByUsers[job.created_by_id] || {
        id: job.created_by_id,
        firstName: '',
        lastName: '',
        email: '',
      },
      assignments: job.scopist_id && scopistUsers[job.scopist_id]
        ? [{ scopist: scopistUsers[job.scopist_id] }]
        : [],
      _count: {
        files: fileCount,
        transcripts: transcriptCount,
      },
      riskScore: riskScoreResult,
      confidenceAnalytics,
    };
  });

  // Client-side sorting by risk/analytics (Feature 1: Workflow Intelligence)
  if (sort === 'risk_desc' || !sort) {
    // DEFAULT SORT: Highest risk first, unscored jobs at bottom
    jobs.sort((a, b) => {
      const aScore = a.riskScore?.score ?? -1;
      const bScore = b.riskScore?.score ?? -1;
      return bScore - aScore;
    });
  } else if (sort === 'risk_asc') {
    jobs.sort((a, b) => {
      const aScore = a.riskScore?.score ?? Infinity;
      const bScore = b.riskScore?.score ?? Infinity;
      return aScore - bScore;
    });
  } else if (sort === 'status') {
    // Priority order for status sorting
    const statusOrder: Record<string, number> = {
      AI_COMPLETE: 0, // Needs review - top priority
      READY_FOR_EDIT: 1,
      IN_EDIT: 2,
      ASSIGNED: 3,
      TRANSCRIBING: 4,
      AI_REVIEWING: 5,
      FILES_UPLOADED: 6,
      CREATED: 7,
      COMPLETED: 8,
    };
    jobs.sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));
  }

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
                Create Your First Deposition
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  // Calculate risk overview (Enhancement 4A)
  const riskOverview = calculateRiskOverview(jobs);

  // Calculate scopist queue metrics (Feature 1.3)
  const criticalCount = jobs.filter(j => j.riskScore?.score && j.riskScore.score >= 75).length;
  const highRiskCount = jobs.filter(j => j.riskScore?.score && j.riskScore.score >= 50 && j.riskScore.score < 75).length;
  const completedToday = jobs.filter(j => j.status === 'COMPLETED' &&
    new Date(j.updatedAt).toDateString() === new Date().toDateString()
  ).length;
  const totalEstimatedMinutes = calculateTotalEffort(jobs); // Feature 4

  return (
    <div className="space-y-4">
      {/* Sort Toggle UI (Feature 1) */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        <div className="flex gap-1">
          <Link href={`/jobs?sort=risk_desc${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}>
            <Button
              variant={sort === 'risk_desc' ? 'default' : 'outline'}
              size="sm"
              className="text-xs gap-1"
            >
              <AlertTriangle className="h-3 w-3" />
              Highest Risk
            </Button>
          </Link>
          <Link href={`/jobs?sort=updated_at${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}>
            <Button
              variant={sort === 'updated_at' ? 'default' : 'outline'}
              size="sm"
              className="text-xs gap-1"
            >
              <Clock className="h-3 w-3" />
              Newest
            </Button>
          </Link>
          <Link href={`/jobs?sort=status${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}>
            <Button
              variant={sort === 'status' ? 'default' : 'outline'}
              size="sm"
              className="text-xs gap-1"
            >
              <ListChecks className="h-3 w-3" />
              Status
            </Button>
          </Link>
        </div>
      </div>

      {/* Scopist Queue Summary (Feature 1.3) - Only show if user is scopist */}
      {user.role === 'SCOPIST' && jobs.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
              <p className="text-xs text-muted-foreground">Critical Risk</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-orange-500">{highRiskCount}</div>
              <p className="text-xs text-muted-foreground">High Risk</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{totalEstimatedMinutes}</div>
              <p className="text-xs text-muted-foreground">Est. Minutes Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{completedToday}</div>
              <p className="text-xs text-muted-foreground">Completed Today</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Risk Overview Widget */}
      {jobs.length > 0 && jobs.some(j => j.riskScore) && (
        <RiskOverviewWidget overview={riskOverview} />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <Link key={job.id} href={`/jobs/${job.id}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full relative">
              {(isAdminRole(user.role) || job.createdBy.id === user.id) && (
                <div className="absolute right-3 top-3 z-10">
                  <DeleteJobButton jobId={job.id} jobTitle={job.title || job.caseName || 'Untitled Job'} />
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2 flex-1">{job.title || job.caseName || 'Untitled Job'}</CardTitle>
                  <div className="flex flex-col gap-2 items-end">
                    <JobStatusBadge status={job.status} />
                    {job.riskScore && (
                      <RiskScoreBadge
                        score={job.riskScore.score}
                        label={job.riskScore.label}
                        color={job.riskScore.color}
                        showIcon={false}
                        className="text-xs"
                      />
                    )}
                    {/* Feature 4: Effort Badge */}
                    {job.riskScore && job.confidenceAnalytics && (() => {
                      const effort = estimateReviewEffort(
                        job.riskScore.score,
                        job.confidenceAnalytics.flagged_count,
                        job.confidenceAnalytics.total_words
                      );
                      return <EffortBadge {...effort} />;
                    })()}
                  </div>
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
      {(total ?? 0) > limit && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {page > 1 && (
            <Link href={`/jobs?page=${page - 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}${sort !== 'updated_at' ? `&sort=${sort}` : ''}`}>
              <Button variant="outline">Previous</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil((total ?? 0) / limit)}
          </span>
          {page < Math.ceil((total ?? 0) / limit) && (
            <Link href={`/jobs?page=${page + 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}${sort !== 'updated_at' ? `&sort=${sort}` : ''}`}>
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


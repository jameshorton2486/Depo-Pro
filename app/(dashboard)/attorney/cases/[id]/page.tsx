// Migrated from Prisma to Supabase queries — PASS 2A
import { auth } from '@/lib/auth-compat';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { CaseDetailView } from '@/components/attorney/case-detail-view';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AttorneyCaseDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const supabase = await createSupabaseServerClient();

  // Verify attorney has access to this case
  const { data: caseMembership } = await supabase
    .from('case_memberships')
    .select('*, cases(*, case_attorneys(*), firms(id, name))')
    .eq('case_id', id)
    .eq('user_id', session.user.id)
    .in('role_in_case', ['ATTORNEY', 'PARALEGAL'])
    .maybeSingle();

  if (!caseMembership) {
    notFound();
  }

  // Get jobs for this case with transcripts
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*, transcriptions(*)')
    .eq('case_id', id)
    .order('deposition_date', { ascending: false });

  // Get attorney's notes for this case
  const { data: annotations } = await supabase
    .from('transcript_notes')
    .select('*, transcriptions(job_id, jobs(case_name, case_number))')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  // Filter annotations to only those for jobs in this case
  const caseAnnotations = (annotations || []).filter((note: any) => {
    const job = note.transcriptions?.jobs;
    return job && jobs?.some((j: any) => j.id === job.id);
  });

  // Transform to match expected format
  const caseData = {
    ...caseMembership.cases,
    jobs: jobs || [],
    attorneys: caseMembership.cases.case_attorneys || [],
    firm: caseMembership.cases.firms,
  };

  return (
    <CaseDetailView
      caseData={caseData as any}
      roleInCase={caseMembership.role_in_case}
      annotations={caseAnnotations as any}
    />
  );
}

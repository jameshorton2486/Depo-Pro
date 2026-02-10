// Migrated from Prisma to Supabase queries — PASS 2A
// ═══════════════════════════════════════════════════════════════
// EDIT JOB PAGE
// ═══════════════════════════════════════════════════════════════

import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getJobById } from '@/lib/supabase/queries/jobs';
import { JobForm } from '@/components/jobs/job-form';

export const dynamic = 'force-dynamic';

interface EditJobPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditJobPage({ params }: EditJobPageProps) {
  const session = await getCurrentUser();

  if (!session) {
    redirect('/login');
  }

  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const job = await getJobById(supabase, id, {
    includeCreatedBy: false,
  });

  if (!job) {
    notFound();
  }

  // 🔒 Security: Only reporter or admin can edit
  const canEdit =
    session.role === 'ADMIN' ||
    job.reporter_id === session.id;

  if (!canEdit) {
    redirect('/dashboard');
  }

  // Convert depositionDate to datetime-local format for the input
  const initialData = {
    id: job.id,
    title: job.title || '',
    caseName: job.case_name || '',
    caseNumber: job.case_number || '',
    depositionDate: job.deposition_date ? new Date(job.deposition_date).toISOString().slice(0, 16) : '',
    location: job.location || '',
    zoomLink: job.zoom_link || '',
    status: job.status,
    notes: job.notes || '',
    internalNotes: job.internal_notes || '',
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Job</h1>
        <p className="text-muted-foreground mt-1">
          Update job details and information
        </p>
      </div>

      <JobForm mode="edit" initialData={initialData} />
    </div>
  );
}

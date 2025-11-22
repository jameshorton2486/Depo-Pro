// ═══════════════════════════════════════════════════════════════
// EDIT JOB PAGE
// ═══════════════════════════════════════════════════════════════

import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { JobForm } from '@/components/jobs/job-form';

interface EditJobPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditJobPage({ params }: EditJobPageProps) {
  const session = await getCurrentUser();
  
  if (!session || !session.user) {
    redirect('/login');
  }

  const { id } = await params;

  const job = await db.job.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      caseName: true,
      caseNumber: true,
      depositionDate: true,
      location: true,
      zoomLink: true,
      status: true,
      notes: true,
      internalNotes: true,
      createdById: true,
    },
  });

  if (!job) {
    notFound();
  }

  // 🔒 Security: Only reporter or admin can edit
  const canEdit =
    session.user.role === 'ADMIN' ||
    job.createdById === session.user.id;

  if (!canEdit) {
    redirect('/dashboard');
  }

  // Convert depositionDate to datetime-local format for the input
  const initialData = {
    ...job,
    depositionDate: job.depositionDate ? new Date(job.depositionDate).toISOString().slice(0, 16) : '',
    caseName: job.caseName || '',
    caseNumber: job.caseNumber || '',
    location: job.location || '',
    zoomLink: job.zoomLink || '',
    notes: job.notes || '',
    internalNotes: job.internalNotes || '',
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

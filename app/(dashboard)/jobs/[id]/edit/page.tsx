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
      court: true,
      depoDate: true,
      location: true,
      status: true,
      totalPages: true,
      rushOrder: true,
      difficulty: true,
      clientName: true,
      clientContact: true,
      notes: true,
      reporterId: true,
      firmId: true,
    },
  });

  if (!job) {
    notFound();
  }

  // 🔒 Security: Only reporter or admin can edit
  const canEdit =
    session.user.role === 'ADMIN' ||
    job.reporterId === session.user.id ||
    (session.user.firmId && job.firmId === session.user.firmId);

  if (!canEdit) {
    redirect('/dashboard');
  }

  // Convert depoDate to datetime-local format for the input
  const initialData = {
    ...job,
    depoDate: job.depoDate ? new Date(job.depoDate).toISOString().slice(0, 16) : '',
    caseName: job.caseName || '',
    caseNumber: job.caseNumber || '',
    court: job.court || '',
    location: job.location || '',
    clientName: job.clientName || '',
    clientContact: job.clientContact || '',
    notes: job.notes || '',
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

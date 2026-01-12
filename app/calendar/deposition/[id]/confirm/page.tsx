import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ConfirmDepositionPageProps {
  params: Promise<{ id: string }>;
}

export default async function ConfirmDepositionPage({ params }: ConfirmDepositionPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string };
  const { id } = await params;

  // Only reporters and admins can confirm depositions
  if (user.role !== 'REPORTER' && user.role !== 'ADMIN' && user.role !== 'COURT_REPORTER') {
    redirect('/unauthorized');
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/calendar"
          className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Calendar
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CheckCircle className="w-6 h-6" />
          Confirm Deposition
        </h1>
        <p className="text-gray-600 mt-2">
          Review and confirm the deposition details before finalizing.
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800 text-sm">
          <strong>Note:</strong> Full deposition confirmation workflow is coming in a future release.
          For now, please confirm the job details from the job page.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-4">
          To confirm this deposition, go to the job details page.
        </p>
        <Link
          href={`/jobs/${id}`}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
        >
          View Job Details
        </Link>
      </div>
    </div>
  );
}

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import Link from 'next/link';
import { Calendar, ArrowLeft } from 'lucide-react';
import { isAdminRole } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function CreateDepositionPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login');
  }

  // Only reporters and admins can create depositions
  if (currentUser.role !== 'REPORTER' && !isAdminRole(currentUser.role) && currentUser.role !== 'COURT_REPORTER') {
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
          <Calendar className="w-6 h-6" />
          Schedule Deposition
        </h1>
        <p className="text-gray-600 mt-2">
          Create a new deposition and assign it to a reporter.
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800 text-sm">
          <strong>Note:</strong> Full deposition scheduling is coming in a future release.
          For now, please create a job from the transcription upload page.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-4">
          To schedule a deposition, create a new job with the deposition date and details.
        </p>
        <Link
          href="/transcription/upload"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-block"
        >
          Create New Job
        </Link>
      </div>
    </div>
  );
}

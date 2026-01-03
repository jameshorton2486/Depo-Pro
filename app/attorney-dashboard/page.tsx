// =============================================================================
// ATTORNEY DASHBOARD
// app/attorney-dashboard/page.tsx
//
// Read-only access to assigned cases
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import Link from 'next/link';
import { FileText, Download } from 'lucide-react';

export default async function AttorneyDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string };

  if (user.role !== 'ATTORNEY') {
    redirect('/dashboard');
  }

  // For now, show all jobs (in production, would filter by attorney assignment)
  const cases = await db.job.findMany({
    where: {
      // In production: attorneyId: user.id or similar
    },
    orderBy: { createdAt: 'desc' },
      include: {
        transcription: {
          select: {
            id: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">My Cases</h1>
      
      <div className="space-y-4">
        {cases.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No cases assigned to you.</p>
          </div>
        ) : (
          cases.map((case_) => (
            <div key={case_.id} className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-lg mb-2">{case_.caseName || case_.title}</h3>
              <p className="text-sm text-gray-500 mb-4">
                {case_.reporter && (
                  <>Reporter: {case_.reporter.firstName} {case_.reporter.lastName} • </>
                )}
                {case_.depositionDate
                  ? new Date(case_.depositionDate).toLocaleDateString()
                  : new Date(case_.createdAt).toLocaleDateString()}
              </p>
              
              {case_.transcription && (
                <div className="flex gap-2">
                  <Link
                    href={`/transcripts/${case_.id}`}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center text-sm"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Transcript
                  </Link>
                  <Link
                    href={`/api/transcripts/${case_.transcription.id}/export?format=pdf`}
                    className="bg-white hover:bg-gray-50 text-indigo-600 px-4 py-2 rounded-lg font-semibold border-2 border-indigo-600 transition-colors flex items-center text-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Link>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

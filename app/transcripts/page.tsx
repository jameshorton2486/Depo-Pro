import { db } from '@/lib/db';
// =============================================================================
// TRANSCRIPTS LIST PAGE
// app/transcripts/page.tsx
//
// List all accessible transcripts with filters
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function TranscriptsPage({ searchParams }: PageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as { id: string; role: string };
  const params = await searchParams;

  const page = parseInt(params.page || '1');
  const status = params.status;
  const search = params.search;

  // Build where clause based on role
  const where: any = {};

  if (user.role === 'REPORTER' || user.role === 'COURT_REPORTER') {
    where.createdById = user.id;
  } else if (user.role === 'SCOPIST') {
    where.scopistId = user.id;
  }
  // Admin and Attorney can see all

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { caseName: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [jobs, total] = await Promise.all([
    db.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
      include: {
        transcription: {
          select: {
            id: true,
            status: true,
            wordCount: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    db.job.count({ where }),
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Transcripts</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <form method="get" className="flex gap-4">
          <input
            type="text"
            name="search"
            placeholder="Search by case name..."
            defaultValue={search}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <select
            name="status"
            defaultValue={status}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="FINALIZED">Finalized</option>
            <option value="DELIVERED">Delivered</option>
          </select>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Transcripts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No transcripts found.</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-semibold">Case Name</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Reporter</th>
                  <th className="text-left p-4 font-semibold">Date</th>
                  <th className="text-left p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {jobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <Link
                        href={`/transcripts/${job.id}`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {job.caseName || job.title}
                      </Link>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {job.transcription?.status || job.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {job.createdBy
                        ? `${job.createdBy.firstName} ${job.createdBy.lastName}`
                        : 'Unknown'}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {job.depositionDate
                        ? new Date(job.depositionDate).toLocaleDateString()
                        : new Date(job.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/transcripts/${job.id}`}
                        className="text-indigo-600 hover:underline text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total > 20 && (
              <div className="p-4 border-t flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} transcripts
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link
                      href={`?page=${page - 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Previous
                    </Link>
                  )}
                  {page * 20 < total && (
                    <Link
                      href={`?page=${page + 1}${status ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}`}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}



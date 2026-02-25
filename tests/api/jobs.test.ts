import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const createSupabaseServerClientMock = vi.fn();
const listJobsMock = vi.fn();
const createJobMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock('@/lib/supabase/queries/jobs', () => ({
  listJobs: listJobsMock,
  createJob: createJobMock,
}));

vi.mock('@/lib/middleware/withRouteProtection', () => ({
  withRouteProtection: (_options: unknown, handler: any) => handler,
}));

function makeSupabaseClient(role: string | null, userId = 'user-123') {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue(
        role
          ? {
              data: { user: { id: userId, user_metadata: { firmId: 'firm-1' } } },
              error: null,
            }
          : {
              data: { user: null },
              error: null,
            }
      ),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: role ? { role } : null,
        error: null,
      }),
    })),
  };
}

describe('Jobs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/jobs', () => {
    it('returns jobs for authenticated user', async () => {
      createSupabaseServerClientMock.mockResolvedValueOnce(makeSupabaseClient('REPORTER'));
      listJobsMock.mockResolvedValueOnce({
        jobs: [
          {
            id: 'job-1',
            title: 'Case 1',
            case_name: 'Case 1',
            case_number: 'C-1',
            deposition_date: '2026-02-01',
            location: 'Remote',
            status: 'CREATED',
            created_by_id: 'user-123',
            firm_id: 'firm-1',
            created_at: '2026-02-01T00:00:00Z',
            updated_at: '2026-02-01T00:00:00Z',
            createdBy: null,
            assignments: [],
          },
        ],
        count: 1,
        totalCount: 1,
        pageCount: 1,
      });

      const { GET } = await import('@/app/api/jobs/route');
      const req = new NextRequest('http://localhost/api/jobs?page=1&limit=10');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(json.jobs)).toBe(true);
      expect(json.jobs).toHaveLength(1);
    });

    it('returns 401 when unauthenticated', async () => {
      createSupabaseServerClientMock.mockResolvedValueOnce(makeSupabaseClient(null));

      const { GET } = await import('@/app/api/jobs/route');
      const req = new NextRequest('http://localhost/api/jobs');
      const res = await GET(req);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/jobs', () => {
    it('creates job for allowed role', async () => {
      createSupabaseServerClientMock.mockResolvedValueOnce(makeSupabaseClient('REPORTER'));
      createJobMock.mockResolvedValueOnce({ id: 'job-new' });

      const { POST } = await import('@/app/api/jobs/route');
      const req = new NextRequest('http://localhost/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          caseName: 'New Case v. Defendant',
          caseNumber: '2026-CV-100',
          depositionDate: '2026-02-01',
        }),
        headers: { 'content-type': 'application/json' },
      });
      const res = await POST(req as any, { params: Promise.resolve({}) } as any);

      expect(res.status).toBe(200);
      expect(createJobMock).toHaveBeenCalledTimes(1);
    });

    it('rejects disallowed role', async () => {
      createSupabaseServerClientMock.mockResolvedValueOnce(makeSupabaseClient('ATTORNEY'));

      const { POST } = await import('@/app/api/jobs/route');
      const req = new NextRequest('http://localhost/api/jobs', {
        method: 'POST',
        body: JSON.stringify({ caseName: 'Case A' }),
        headers: { 'content-type': 'application/json' },
      });
      const res = await POST(req as any, { params: Promise.resolve({}) } as any);

      expect(res.status).toBe(403);
    });
  });
});

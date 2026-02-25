import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const acquireJobLockMock = vi.fn();
const releaseJobLockMock = vi.fn();
const getJobLockStatusMock = vi.fn();
const isJobLockedByUserMock = vi.fn();
const captureErrorMock = vi.fn();

let mockUser: any = { id: 'user-1', role: 'SCOPIST' };
let mockSupabase: any = null;

vi.mock('@/lib/supabase/queries/locks', () => ({
  acquireJobLock: acquireJobLockMock,
  releaseJobLock: releaseJobLockMock,
  getJobLockStatus: getJobLockStatusMock,
  isJobLockedByUser: isJobLockedByUserMock,
}));

vi.mock('@/lib/error-capture', () => ({
  captureError: captureErrorMock,
}));

vi.mock('@/lib/middleware/withRouteProtection', () => ({
  withRouteProtection:
    (_options: unknown, handler: any) =>
    async (req: NextRequest, ctx?: { params?: Promise<{ id: string }> | { id: string } }) => {
      if (!mockUser) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as any;
      }

      const resolvedParams = ctx?.params
        ? await Promise.resolve(ctx.params as any)
        : { id: 'job-1' };

      return handler(req, {
        user: mockUser,
        supabase: mockSupabase,
        params: resolvedParams,
      });
    },
}));

function makeSupabase(jobStatus: string = 'IN_REVIEW') {
  return {
    from: vi.fn((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'job-1', status: jobStatus },
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };
}

describe('Lock API - /api/jobs/[id]/lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockUser = { id: 'user-1', role: 'SCOPIST' };
    mockSupabase = makeSupabase();
  });

  describe('POST (acquire)', () => {
    it('returns 401 when unauthenticated', async () => {
      mockUser = null;
      const route = await import('@/app/api/jobs/[id]/lock/route');
      const req = new NextRequest('http://localhost/api/jobs/job-1/lock', { method: 'POST' });
      const res = await route.POST(req, { params: Promise.resolve({ id: 'job-1' }) });
      expect(res.status).toBe(401);
    });

    it('acquires lock successfully', async () => {
      acquireJobLockMock.mockResolvedValueOnce({ error: null });
      getJobLockStatusMock.mockResolvedValueOnce({
        data: { lock_expires_at: '2026-02-24T14:00:00Z', user_id: 'user-1' },
        error: null,
      });

      const route = await import('@/app/api/jobs/[id]/lock/route');
      const req = new NextRequest('http://localhost/api/jobs/job-1/lock', { method: 'POST' });
      const res = await route.POST(req, { params: Promise.resolve({ id: 'job-1' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.locked).toBe(true);
    });

    it('returns 423 when held by another user', async () => {
      acquireJobLockMock.mockResolvedValueOnce({ error: new Error('already locked') });
      getJobLockStatusMock.mockResolvedValueOnce({
        data: {
          user_id: 'user-2',
          lock_expires_at: '2026-02-24T14:00:00Z',
          user: { full_name: 'Jane Doe', email: 'jane@test.com' },
        },
        error: null,
      });

      const route = await import('@/app/api/jobs/[id]/lock/route');
      const req = new NextRequest('http://localhost/api/jobs/job-1/lock', { method: 'POST' });
      const res = await route.POST(req, { params: Promise.resolve({ id: 'job-1' }) });

      expect(res.status).toBe(423);
      const json = await res.json();
      expect(json.lockedBy).toBe('user-2');
    });

    it('returns 409 for terminal status jobs', async () => {
      mockSupabase = makeSupabase('SCOPIST_COMPLETE');

      const route = await import('@/app/api/jobs/[id]/lock/route');
      const req = new NextRequest('http://localhost/api/jobs/job-1/lock', { method: 'POST' });
      const res = await route.POST(req, { params: Promise.resolve({ id: 'job-1' }) });

      expect(res.status).toBe(409);
    });
  });

  describe('DELETE (release)', () => {
    it('releases lock successfully', async () => {
      isJobLockedByUserMock.mockResolvedValueOnce(true);
      releaseJobLockMock.mockResolvedValueOnce({ error: null });

      const route = await import('@/app/api/jobs/[id]/lock/route');
      const req = new NextRequest('http://localhost/api/jobs/job-1/lock', { method: 'DELETE' });
      const res = await route.DELETE(req, { params: Promise.resolve({ id: 'job-1' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.released).toBe(true);
    });

    it('returns 403 when caller does not hold lock', async () => {
      isJobLockedByUserMock.mockResolvedValueOnce(false);

      const route = await import('@/app/api/jobs/[id]/lock/route');
      const req = new NextRequest('http://localhost/api/jobs/job-1/lock', { method: 'DELETE' });
      const res = await route.DELETE(req, { params: Promise.resolve({ id: 'job-1' }) });

      expect(res.status).toBe(403);
    });
  });

  describe('GET (status check)', () => {
    it('returns unlocked when no lock exists', async () => {
      getJobLockStatusMock.mockResolvedValueOnce({ data: null, error: null });

      const route = await import('@/app/api/jobs/[id]/lock/route');
      const req = new NextRequest('http://localhost/api/jobs/job-1/lock');
      const res = await route.GET(req, { params: Promise.resolve({ id: 'job-1' }) });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.isLocked).toBe(false);
    });
  });
});

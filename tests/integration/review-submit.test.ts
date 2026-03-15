import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getCurrentUserMock = vi.fn();
const createSupabaseServerClientMock = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock('@/lib/middleware/withRouteProtection', () => ({
  withRouteProtection: (_opts: unknown, handler: any) => handler,
}));

vi.mock('@/lib/error-capture', () => ({
  captureError: vi.fn(),
}));

function createSubmitSupabase(options: { pendingCount?: number } = {}) {
  const { pendingCount = 0 } = options;
  const transcriptionLocksUpdateMock = vi.fn().mockReturnValue({
    eq: vi
      .fn()
      .mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      .mockResolvedValue({ data: null, error: null }),
  });

  const fromMock = vi.fn((table: string) => {
    if (table === 'jobs') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'job-1', firm_id: 'firm-1', status: 'IN_REVIEW', reporter_id: 'user-1' },
          error: null,
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
    }

    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { firm_id: 'firm-1' }, error: null }),
      };
    }

    if (table === 'transcriptions') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'tx-1' }, error: null }),
      };
    }

    if (table === 'flagged_words') {
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn(),
      };
      chain.eq
        .mockReturnValueOnce(chain)
        .mockResolvedValue({ count: pendingCount, error: null });
      return chain;
    }

    if (table === 'transcription_locks') {
      return {
        update: transcriptionLocksUpdateMock,
      };
    }

    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });

  return {
    from: fromMock,
  };
}

describe('Review Submit - POST /api/jobs/[id]/review/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 401 when unauthenticated', async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);
    const route = await import('@/app/api/jobs/[id]/review/submit/route');
    const req = new NextRequest('http://localhost/api/jobs/job-1/review/submit', {
      method: 'POST',
    });
    const res = await route.POST(req, { params: Promise.resolve({ id: 'job-1' }) });
    expect(res.status).toBe(401);
  });

  it('succeeds with warning when flagged words are still pending (no longer blocks)', async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: 'user-1', role: 'SCOPIST' });
    createSupabaseServerClientMock.mockResolvedValueOnce(
      createSubmitSupabase({ pendingCount: 5 })
    );

    const route = await import('@/app/api/jobs/[id]/review/submit/route');
    const req = new NextRequest('http://localhost/api/jobs/job-1/review/submit', {
      method: 'POST',
    });
    const res = await route.POST(req, { params: Promise.resolve({ id: 'job-1' }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.unresolvedFlagCount).toBe(5);
  });

  it('succeeds when all words are reviewed', async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: 'user-1', role: 'SCOPIST' });
    createSupabaseServerClientMock.mockResolvedValueOnce(
      createSubmitSupabase({ pendingCount: 0 })
    );

    const route = await import('@/app/api/jobs/[id]/review/submit/route');
    const req = new NextRequest('http://localhost/api/jobs/job-1/review/submit', {
      method: 'POST',
    });
    const res = await route.POST(req, { params: Promise.resolve({ id: 'job-1' }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.newStatus).toBe('SCOPIST_COMPLETE');
  });

  it('attempts lock release on successful submit', async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: 'user-1', role: 'SCOPIST' });
    const supabase = createSubmitSupabase({ pendingCount: 0 });
    createSupabaseServerClientMock.mockResolvedValueOnce(supabase);

    const route = await import('@/app/api/jobs/[id]/review/submit/route');
    const req = new NextRequest('http://localhost/api/jobs/job-1/review/submit', {
      method: 'POST',
    });
    await route.POST(req, { params: Promise.resolve({ id: 'job-1' }) });

    expect(supabase.from).toHaveBeenCalledWith('transcription_locks');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getCurrentUserMock = vi.fn();
const createSupabaseServerClientMock = vi.fn();
const isJobLockedByOtherMock = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock('@/lib/supabase/queries/locks', () => ({
  isJobLockedByOther: isJobLockedByOtherMock,
}));

vi.mock('@/lib/middleware/withRouteProtection', () => ({
  withRouteProtection: (_options: unknown, handler: any) => handler,
}));

function makeSupabaseForConflict() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'job-1', created_by_id: 'user-1', firm_id: 'firm-1' },
            error: null,
          }),
        };
      }
      if (table === 'transcriptions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'tx-1', updated_at: '2026-02-22T12:00:30.000Z' },
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

describe('Flagged Words API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns 401 when unauthenticated', async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);
    const route = await import('@/app/api/jobs/[id]/flagged-words/route');

    const req = new NextRequest('http://localhost/api/jobs/job-1/flagged-words');
    const res = await route.GET(req, { params: Promise.resolve({ id: 'job-1' }) });
    expect(res.status).toBe(401);
  });

  it('PATCH requires expectedUpdatedAt', async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: 'user-1', role: 'SCOPIST' });
    const route = await import('@/app/api/jobs/[id]/flagged-words/route');

    const req = new NextRequest('http://localhost/api/jobs/job-1/flagged-words', {
      method: 'PATCH',
      body: JSON.stringify({ wordId: 'tx-1-0', correctedText: 'corrected' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await route.PATCH(req, { params: Promise.resolve({ id: 'job-1' }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('expectedUpdatedAt');
  });

  it('PATCH returns 409 for stale optimistic lock timestamp', async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: 'user-1', role: 'SCOPIST' });
    createSupabaseServerClientMock.mockResolvedValueOnce(makeSupabaseForConflict());
    isJobLockedByOtherMock.mockResolvedValueOnce(false);
    const route = await import('@/app/api/jobs/[id]/flagged-words/route');

    const req = new NextRequest('http://localhost/api/jobs/job-1/flagged-words', {
      method: 'PATCH',
      body: JSON.stringify({
        wordId: 'tx-1-0',
        correctedText: 'corrected',
        expectedUpdatedAt: '2026-02-22T11:59:00.000Z',
      }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await route.PATCH(req, { params: Promise.resolve({ id: 'job-1' }) });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe('CONFLICT');
    expect(typeof json.serverUpdatedAt).toBe('string');
  });
});


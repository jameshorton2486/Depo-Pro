import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getCurrentUserMock = vi.fn();
const createSupabaseServerClientMock = vi.fn();
const getUserByIdMock = vi.fn();
const getJobForAccessCheckMock = vi.fn();
const getUsersByRoleMock = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock('@/lib/supabase/queries/users', () => ({
  getUserById: getUserByIdMock,
  getUsersByRole: getUsersByRoleMock,
}));

vi.mock('@/lib/supabase/queries/jobs', () => ({
  getJobForAccessCheck: getJobForAccessCheckMock,
}));

vi.mock('@/lib/middleware/withRouteProtection', async () => {
  const actual = await vi.importActual<any>('@/lib/middleware/withRouteProtection');
  return {
    ...actual,
    withRouteProtection: (_opts: unknown, handler: any) => handler,
  };
});

describe('Tenant Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Firm A user cannot access Firm B jobs', async () => {
    const { verifyJobTenantAccess } = await import('@/lib/middleware/withRouteProtection');
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'job-b', firm_id: 'firm-b', reporter_id: 'reporter-b', scopist_id: 'scopist-b' },
          error: null,
        }),
      })),
    };

    const result = await verifyJobTenantAccess(supabase, 'job-b', 'firm-a', 'user-a', 'REPORTER');
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('cross-firm');
  });

  it('Firm A user cannot access Firm B transcripts via job tenant check', async () => {
    const { verifyJobTenantAccess } = await import('@/lib/middleware/withRouteProtection');
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'job-b', firm_id: 'firm-b', reporter_id: 'reporter-b', scopist_id: null },
          error: null,
        }),
      })),
    };

    const result = await verifyJobTenantAccess(supabase, 'job-b', 'firm-a', 'user-a', 'SCOPIST');
    expect(result.allowed).toBe(false);
  });

  it('Firm A user cannot access Firm B flagged words', async () => {
    const { verifyJobTenantAccess } = await import('@/lib/middleware/withRouteProtection');
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'job-b', firm_id: 'firm-b', reporter_id: 'reporter-b', scopist_id: 'user-b' },
          error: null,
        }),
      })),
    };

    const result = await verifyJobTenantAccess(supabase, 'job-b', 'firm-a', 'user-a', 'SCOPIST');
    expect(result.allowed).toBe(false);
  });

  it('Admin from Firm A cannot see Firm B data', async () => {
    const { verifyJobTenantAccess } = await import('@/lib/middleware/withRouteProtection');
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'job-b', firm_id: 'firm-b', reporter_id: 'reporter-b', scopist_id: 'scopist-b' },
          error: null,
        }),
      })),
    };

    const result = await verifyJobTenantAccess(supabase, 'job-b', 'firm-a', 'admin-a', 'ADMIN');
    expect(result.allowed).toBe(false);
  });

  it('cross-firm job assignment is rejected', async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: 'admin-a',
      role: 'ADMIN',
      firmId: 'firm-a',
      email: 'admin@firm-a.com',
    });
    getUserByIdMock.mockResolvedValueOnce({
      id: 'admin-a',
      user_metadata: { role: 'ADMIN', firmId: 'firm-a' },
    });
    getJobForAccessCheckMock.mockResolvedValueOnce({
      id: 'job-a',
      created_by_id: 'admin-a',
    });
    getUsersByRoleMock.mockResolvedValueOnce([
      { id: 'scopist-a', user_metadata: { role: 'SCOPIST', firmId: 'firm-a' }, email: 's@a.com' },
    ]);
    createSupabaseServerClientMock.mockResolvedValueOnce({});

    const route = await import('@/app/api/jobs/[id]/assign/route');
    const req = new NextRequest('http://localhost/api/jobs/job-a/assign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scopistId: 'ck123differentfirm' }),
    });

    const res = await route.POST(req, { params: Promise.resolve({ id: 'job-a' }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('INVALID_SCOPIST');
  });
});

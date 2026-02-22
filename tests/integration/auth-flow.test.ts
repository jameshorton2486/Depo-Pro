import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const createSupabaseServerClientMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

describe('Auth Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getCurrentUser returns null when no session', async () => {
    createSupabaseServerClientMock.mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    });

    const { getCurrentUser } = await import('@/lib/auth/session');
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it('getCurrentUser returns user with role and firm', async () => {
    createSupabaseServerClientMock.mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@test.com' } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'REPORTER', full_name: 'Test Reporter', firm_id: 'firm-abc' },
          error: null,
        }),
      })),
    });

    const { getCurrentUser } = await import('@/lib/auth/session');
    const user = await getCurrentUser();
    expect(user).toEqual({
      id: 'user-123',
      email: 'test@test.com',
      role: 'REPORTER',
      name: 'Test Reporter',
      firmId: 'firm-abc',
    });
  });

  it('middleware redirects unauthenticated protected request to /login', async () => {
    vi.resetModules();
    vi.doMock('@supabase/ssr', () => ({
      createServerClient: vi.fn(() => ({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: null,
          }),
        },
      })),
    }));

    const { middleware } = await import('@/middleware');
    const req = new NextRequest('http://localhost/dashboard');
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('withRouteProtection denies unauthorized roles', async () => {
    vi.resetModules();
    vi.doMock('@/lib/auth/session', () => ({
      getCurrentUser: vi.fn().mockResolvedValue({
        id: 'user-123',
        email: 'test@test.com',
        role: 'SCOPIST',
        firmId: 'firm-abc',
        name: 'Scopist User',
      }),
    }));
    vi.doMock('@/lib/supabase/server', () => ({
      createSupabaseServerClient: vi.fn().mockResolvedValue({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { firm_id: 'firm-abc', role: 'SCOPIST' },
            error: null,
          }),
        })),
      }),
    }));
    const { withRouteProtection } = await import('@/lib/middleware/withRouteProtection');
    const handler = withRouteProtection(
      { requireAuth: true, requireRole: ['ADMIN' as any] },
      async () => new Response('ok') as any,
    );
    const req = new NextRequest('http://localhost/api/admin-only');
    const res = await handler(req, { params: Promise.resolve({}) });

    expect(res.status).toBe(403);
  });

  it('session refresh path allows authenticated users off login page', async () => {
    vi.resetModules();
    vi.doMock('@supabase/ssr', () => ({
      createServerClient: vi.fn(() => ({
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                user: {
                  id: 'user-123',
                  user_metadata: { role: 'REPORTER', org_id: 'org-1', case_ids: [] },
                },
              },
            },
            error: null,
          }),
        },
      })),
    }));

    const { middleware } = await import('@/middleware');
    const req = new NextRequest('http://localhost/login');
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard');
  });
});

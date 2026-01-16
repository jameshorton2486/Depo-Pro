/**
 * Middleware Authentication Integration Tests
 *
 * Verifies that middleware correctly:
 * - Parses Supabase auth cookies
 * - Redirects unauthenticated users
 * - Allows authenticated users
 * - Enforces role-based access control (RBAC)
 * - Enforces organization scoping
 * - Enforces case scoping
 * - Handles edge cases
 */

import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { createServerClient } from '@supabase/ssr';

// Mock Supabase client for testing
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

describe('middleware auth session parsing', () => {
  const baseUrl = 'http://localhost:3000';

  describe('Public routes', () => {
    it('allows access to public routes without authentication', async () => {
      const req = new NextRequest(`${baseUrl}/login`);
      const res = await middleware(req);

      // Should not redirect (status 200 or NextResponse.next())
      expect(res.status).not.toBe(302);
      expect(res.status).not.toBe(307);
    });

    it('allows access to home page without authentication', async () => {
      const req = new NextRequest(`${baseUrl}/`);
      const res = await middleware(req);

      expect(res.status).not.toBe(302);
      expect(res.status).not.toBe(307);
    });
  });

  describe('Protected routes', () => {
    it('redirects to login when no session cookie is present', async () => {
      const req = new NextRequest(`${baseUrl}/dashboard`);
      const res = await middleware(req);

      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain('callbackUrl');
    });

    it('preserves callback URL in redirect', async () => {
      const req = new NextRequest(`${baseUrl}/dashboard?tab=settings`);
      const res = await middleware(req);

      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('callbackUrl=/dashboard%3Ftab%3Dsettings');
    });
  });

  describe('Auth redirect routes', () => {
    it('allows unauthenticated users to access login page', async () => {
      const req = new NextRequest(`${baseUrl}/login`);
      const res = await middleware(req);

      expect(res.status).not.toBe(302);
    });

    // Note: Testing authenticated redirect requires mocking Supabase client
    // This would require more complex setup with Supabase test utilities
    // For now, we verify the middleware structure is correct
  });

  describe('Bypass routes', () => {
    it('bypasses middleware for static assets', async () => {
      const req = new NextRequest(`${baseUrl}/_next/static/chunk.js`);
      const res = await middleware(req);

      expect(res.status).not.toBe(302);
    });

    it('bypasses middleware for favicon', async () => {
      const req = new NextRequest(`${baseUrl}/favicon.ico`);
      const res = await middleware(req);

      expect(res.status).not.toBe(302);
    });

    it('bypasses middleware for health check', async () => {
      const req = new NextRequest(`${baseUrl}/api/health`);
      const res = await middleware(req);

      expect(res.status).not.toBe(302);
    });
  });

  describe('Security headers', () => {
    it('applies security headers to all responses', async () => {
      const req = new NextRequest(`${baseUrl}/login`);
      const res = await middleware(req);

      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
    });
  });

  describe('Edge cases', () => {
    it('handles routes with query parameters', async () => {
      const req = new NextRequest(`${baseUrl}/dashboard?filter=active&sort=date`);
      const res = await middleware(req);

      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('redirect');
    });

    it('handles nested protected routes', async () => {
      const req = new NextRequest(`${baseUrl}/dashboard/settings`);
      const res = await middleware(req);

      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('/login');
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
    });

    it('allows REPORTER to access /dashboard', async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                user: {
                  id: 'user-123',
                  email: 'reporter@example.com',
                  user_metadata: {
                    role: 'REPORTER',
                  },
                },
              },
            },
            error: null,
          }),
        },
      };

      (createServerClient as jest.Mock).mockReturnValue(mockSupabase);

      const req = new NextRequest(`${baseUrl}/dashboard`);
      const res = await middleware(req);

      // Should not redirect (access allowed)
      expect(res.status).not.toBe(302);
    });

    it('blocks REPORTER from accessing /admin', async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                user: {
                  id: 'user-123',
                  email: 'reporter@example.com',
                  user_metadata: {
                    role: 'REPORTER',
                  },
                },
              },
            },
            error: null,
          }),
        },
      };

      (createServerClient as jest.Mock).mockReturnValue(mockSupabase);

      const req = new NextRequest(`${baseUrl}/admin`);
      const res = await middleware(req);

      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('/unauthorized');
      expect(location).toContain('insufficient_role');
    });

    it('allows ADMIN to access all routes', async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                user: {
                  id: 'user-123',
                  email: 'admin@example.com',
                  user_metadata: {
                    role: 'ADMIN',
                  },
                },
              },
            },
            error: null,
          }),
        },
      };

      (createServerClient as jest.Mock).mockReturnValue(mockSupabase);

      const req = new NextRequest(`${baseUrl}/admin`);
      const res = await middleware(req);

      // Should not redirect (access allowed)
      expect(res.status).not.toBe(302);
    });

    it('redirects when role is missing', async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                user: {
                  id: 'user-123',
                  email: 'user@example.com',
                  user_metadata: {}, // No role
                },
              },
            },
            error: null,
          }),
        },
      };

      (createServerClient as jest.Mock).mockReturnValue(mockSupabase);

      const req = new NextRequest(`${baseUrl}/dashboard`);
      const res = await middleware(req);

      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('/unauthorized');
      expect(location).toContain('missing_role');
    });
  });

  describe('Organization Scoping', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('allows access when org_id matches URL', async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                user: {
                  id: 'user-123',
                  email: 'user@example.com',
                  user_metadata: {
                    role: 'REPORTER',
                    org_id: 'org-123',
                  },
                },
              },
            },
            error: null,
          }),
        },
      };

      (createServerClient as jest.Mock).mockReturnValue(mockSupabase);

      const req = new NextRequest(`${baseUrl}/org/org-123/dashboard`);
      const res = await middleware(req);

      // Should not redirect (org matches)
      expect(res.status).not.toBe(302);
    });

    it('blocks access when org_id does not match URL', async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                user: {
                  id: 'user-123',
                  email: 'user@example.com',
                  user_metadata: {
                    role: 'REPORTER',
                    org_id: 'org-123',
                  },
                },
              },
            },
            error: null,
          }),
        },
      };

      (createServerClient as jest.Mock).mockReturnValue(mockSupabase);

      const req = new NextRequest(`${baseUrl}/org/org-456/dashboard`);
      const res = await middleware(req);

      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('/unauthorized');
      expect(location).toContain('org_mismatch');
    });
  });

  describe('Case Scoping', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('allows access when case_id is in case_ids array', async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                user: {
                  id: 'user-123',
                  email: 'user@example.com',
                  user_metadata: {
                    role: 'SCOPIST',
                    case_ids: ['case-123', 'case-456'],
                  },
                },
              },
            },
            error: null,
          }),
        },
      };

      (createServerClient as jest.Mock).mockReturnValue(mockSupabase);

      const req = new NextRequest(`${baseUrl}/cases/case-123`);
      const res = await middleware(req);

      // Should not redirect (case access allowed)
      expect(res.status).not.toBe(302);
    });

    it('blocks access when case_id is not in case_ids array', async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                user: {
                  id: 'user-123',
                  email: 'user@example.com',
                  user_metadata: {
                    role: 'SCOPIST',
                    case_ids: ['case-123'],
                  },
                },
              },
            },
            error: null,
          }),
        },
      };

      (createServerClient as jest.Mock).mockReturnValue(mockSupabase);

      const req = new NextRequest(`${baseUrl}/cases/case-999`);
      const res = await middleware(req);

      expect(res.status).toBe(302);
      const location = res.headers.get('location');
      expect(location).toContain('/unauthorized');
      expect(location).toContain('case_access_denied');
    });

    it('allows access when case_ids is empty (no case scoping)', async () => {
      const mockSupabase = {
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                user: {
                  id: 'user-123',
                  email: 'user@example.com',
                  user_metadata: {
                    role: 'ADMIN',
                    case_ids: [], // Empty = no case scoping
                  },
                },
              },
            },
            error: null,
          }),
        },
      };

      (createServerClient as jest.Mock).mockReturnValue(mockSupabase);

      const req = new NextRequest(`${baseUrl}/cases/case-999`);
      const res = await middleware(req);

      // Should not redirect (ADMIN with empty case_ids = no scoping)
      expect(res.status).not.toBe(302);
    });
  });
});

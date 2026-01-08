import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest, mockAuthSession } from '../utils/test-helpers';

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  })),
}));

describe('Jobs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/jobs', () => {
    it('should return jobs for authenticated user', async () => {
      const { auth } = await import('@/lib/auth');
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'REPORTER' },
      } as any);

      const mockJobs = [
        { id: 'job-1', case_name: 'Case 1', status: 'PENDING' },
        { id: 'job-2', case_name: 'Case 2', status: 'AI_COMPLETE' },
      ];

      const { createSupabaseServerClient } = await import('@/lib/supabase/server');
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
        })),
        auth: {
          getUser: vi.fn().mockResolvedValue({ 
            data: { user: { id: 'user-123' } }, 
            error: null 
          }),
        },
      };
      vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

      // Import route handler
      const { GET } = await import('@/app/api/jobs/route');
      const request = createMockRequest('GET');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.jobs) || Array.isArray(data)).toBe(true);
    });

    it('should return 401 for unauthenticated request', async () => {
      const { auth } = await import('@/lib/auth');
      vi.mocked(auth).mockResolvedValue(null);

      const { GET } = await import('@/app/api/jobs/route');
      const request = createMockRequest('GET');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/jobs', () => {
    it('should create job with valid data', async () => {
      const { auth } = await import('@/lib/auth');
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'REPORTER' },
      } as any);

      const jobData = {
        case_name: 'New Case v. Defendant',
        case_number: '2024-CV-99999',
        deposition_date: '2026-02-01',
      };

      const { createSupabaseServerClient } = await import('@/lib/supabase/server');
      const mockSupabase = {
        from: vi.fn(() => ({
          insert: vi.fn().mockResolvedValue({ data: { id: 'job-new', ...jobData }, error: null }),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'job-new', ...jobData }, error: null }),
        })),
        auth: {
          getUser: vi.fn().mockResolvedValue({ 
            data: { user: { id: 'user-123' } }, 
            error: null 
          }),
        },
      };
      vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any);

      const { POST } = await import('@/app/api/jobs/route');
      const request = createMockRequest('POST', jobData);
      const response = await POST(request);

      expect([201, 200]).toContain(response.status);
    });

    it('should reject invalid data', async () => {
      const { auth } = await import('@/lib/auth');
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'REPORTER' },
      } as any);

      const invalidData = {
        // Missing required case_name
        case_number: '2024-CV-99999',
      };

      const { POST } = await import('@/app/api/jobs/route');
      const request = createMockRequest('POST', invalidData);
      const response = await POST(request);

      expect([400, 422]).toContain(response.status);
    });
  });
});

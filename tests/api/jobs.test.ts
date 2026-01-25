import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockRequest } from '../utils/test-helpers';

// Mock the auth module
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  })),
}));

// Mock jobs queries
vi.mock('@/lib/supabase/queries/jobs', () => ({
  listJobs: vi.fn(),
  createJob: vi.fn(),
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
      vi.mocked(createSupabaseServerClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-123',
                user_metadata: { role: 'REPORTER' },
              },
            },
            error: null,
          }),
        },
      } as any);

      const { listJobs } = await import('@/lib/supabase/queries/jobs');
      vi.mocked(listJobs).mockResolvedValue({
        jobs: mockJobs,
        count: mockJobs.length,
      });

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

      const { createSupabaseServerClient } = await import('@/lib/supabase/server');
      vi.mocked(createSupabaseServerClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      } as any);

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
        caseName: 'New Case v. Defendant',
        caseNumber: '2024-CV-99999',
        depositionDate: '2026-02-01',
      };

      const { createSupabaseServerClient } = await import('@/lib/supabase/server');
      vi.mocked(createSupabaseServerClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-123',
                user_metadata: { role: 'REPORTER' },
              },
            },
            error: null,
          }),
        },
      } as any);

      const { createJob } = await import('@/lib/supabase/queries/jobs');
      vi.mocked(createJob).mockResolvedValue({ id: 'job-new' });

      const { POST } = await import('@/app/api/jobs/route');
      const request = createMockRequest('POST', jobData);
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('should reject invalid data', async () => {
      const { auth } = await import('@/lib/auth');
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'REPORTER' },
      } as any);

      const invalidData = {
        // Missing required case_name
        caseNumber: '2024-CV-99999',
      };

      const { POST } = await import('@/app/api/jobs/route');
      const request = createMockRequest('POST', invalidData);
      const response = await POST(request);

      expect([400, 422]).toContain(response.status);
    });
  });
});

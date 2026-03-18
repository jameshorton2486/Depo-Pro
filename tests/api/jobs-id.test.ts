import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getJobForAccessCheckMock = vi.fn();
const getJobByIdMock = vi.fn();
const listFilesForJobMock = vi.fn();
const updateJobStatusMock = vi.fn();
const updateJobMock = vi.fn();

vi.mock('@/lib/supabase/queries/jobs', () => ({
  getJobForAccessCheck: getJobForAccessCheckMock,
  getJobById: getJobByIdMock,
  updateJobStatus: updateJobStatusMock,
  updateJob: updateJobMock,
}));

vi.mock('@/lib/supabase/queries/files', () => ({
  listFilesForJob: listFilesForJobMock,
}));

vi.mock('@/lib/middleware/withRouteProtection', () => ({
  withRouteProtection: (_options: unknown, handler: any) => handler,
}));

vi.mock('@/lib/transcription/pipeline', () => ({
  processTranscriptionJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/audio-enhancement-service', () => ({
  AudioEnhancementService: {
    enhanceWithDolby: vi.fn().mockResolvedValue({ success: false }),
    addToRxQueue: vi.fn().mockResolvedValue({ success: true, queuePosition: 1 }),
  },
}));

vi.mock('@/lib/rate-limit-service', () => ({
  checkCombinedRateLimit: vi.fn().mockReturnValue({ allowed: true, userResult: {} }),
  rateLimitResponse: vi.fn().mockReturnValue(new Response('Rate limited', { status: 429 })),
}));

function makeSupabaseMock() {
  return {
    from: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  };
}

function makeProtectedContext(supabase: any, userId = 'user-123', role = 'REPORTER', jobId = 'job-7044a6e4-f007-42cf-a279-651951c959c2') {
  return {
    user: { id: userId, role, firm_id: 'firm-1', email: 'test@test.com' },
    supabase,
    params: { id: jobId },
  };
}

describe('Jobs [id] API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DELETE /api/jobs/[id]', () => {
    it('soft-deletes job when user is owner', async () => {
      const jobId = 'job-7044a6e4-f007-42cf-a279-651951c959c2';
      getJobForAccessCheckMock.mockResolvedValueOnce({
        id: jobId,
        firm_id: 'firm-1',
        created_by_id: 'user-123',
      });

      const supabase = makeSupabaseMock();
      const { DELETE } = await import('@/app/api/jobs/[id]/route');
      const req = new NextRequest('http://localhost/api/jobs/' + jobId, { method: 'DELETE' });
      const res = await DELETE(req as any, makeProtectedContext(supabase, 'user-123', 'REPORTER', jobId) as any);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(getJobForAccessCheckMock).toHaveBeenCalledWith(
        supabase,
        jobId,
        expect.objectContaining({ verifyAccessForUserId: 'user-123' })
      );
    });

    it('returns 404 when job not found', async () => {
      getJobForAccessCheckMock.mockResolvedValueOnce(null);

      const supabase = makeSupabaseMock();
      const { DELETE } = await import('@/app/api/jobs/[id]/route');
      const req = new NextRequest('http://localhost/api/jobs/job-1', { method: 'DELETE' });
      const res = await DELETE(req as any, makeProtectedContext(supabase) as any);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe('Job not found');
    });

    it('returns 403 when user is not owner or admin', async () => {
      getJobForAccessCheckMock.mockResolvedValueOnce({
        id: 'job-1',
        firm_id: 'firm-1',
        created_by_id: 'other-user',
      });

      const supabase = makeSupabaseMock();
      const { DELETE } = await import('@/app/api/jobs/[id]/route');
      const req = new NextRequest('http://localhost/api/jobs/job-1', { method: 'DELETE' });
      const res = await DELETE(req as any, makeProtectedContext(supabase, 'user-123', 'SCOPIST') as any);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe('Forbidden');
    });
  });

  describe('POST /api/jobs/[id]/transcribe', () => {
    it('returns 400 when no audio file', async () => {
      const jobId = 'job-7044a6e4-f007-42cf-a279-651951c959c2';
      getJobByIdMock.mockResolvedValueOnce({
        id: jobId,
        firm_id: 'firm-1',
        created_by_id: 'user-123',
        audio_file_url: null,
        status: 'PENDING',
      });
      listFilesForJobMock.mockResolvedValueOnce([]);

      const supabase = makeSupabaseMock();
      const { POST } = await import('@/app/api/jobs/[id]/transcribe/route');
      const req = new NextRequest('http://localhost/api/jobs/' + jobId + '/transcribe', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      });
      const res = await POST(req as any, makeProtectedContext(supabase, 'user-123', 'REPORTER', jobId) as any);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('No audio file found for this job');
    });

    it('returns 200 and starts transcription when audio exists', async () => {
      const jobId = 'job-7044a6e4-f007-42cf-a279-651951c959c2';
      getJobByIdMock.mockResolvedValueOnce({
        id: jobId,
        firm_id: 'firm-1',
        created_by_id: 'user-123',
        audio_file_url: 'https://storage.example/audio.mp3',
        status: 'PENDING',
      });
      listFilesForJobMock.mockResolvedValueOnce([]);
      updateJobStatusMock.mockResolvedValue({});

      const supabase = makeSupabaseMock();
      const { POST } = await import('@/app/api/jobs/[id]/transcribe/route');
      const req = new NextRequest('http://localhost/api/jobs/' + jobId + '/transcribe', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
      });
      const res = await POST(req as any, makeProtectedContext(supabase, 'user-123', 'REPORTER', jobId) as any);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toContain('Transcription started');
    });
  });
});

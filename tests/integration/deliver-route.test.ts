import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const createAdminClientMock = vi.fn();
const generateDownloadTokenMock = vi.fn();
const sendEmailMock = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock('@/lib/security/download-tokens', () => ({
  generateDownloadToken: generateDownloadTokenMock,
}));

vi.mock('@/lib/email', () => ({
  sendEmail: sendEmailMock,
  transcriptDeliveredEmail: vi.fn().mockReturnValue({
    to: 'atty@test.com',
    subject: 'Transcript Delivered',
    html: '<p>link</p>',
  }),
}));

vi.mock('@/lib/middleware/withRouteProtection', () => ({
  withRouteProtection: (_opts: unknown, handler: any) => handler,
}));

vi.mock('@/lib/admin', () => ({
  isAdminRole: vi.fn((role: string) => role === 'ADMIN' || role === 'SUPER_ADMIN'),
}));

function makeSupabaseMock({
  jobFound = true,
  ownerId = 'reporter-1',
  firmId = 'firm-1',
  transcriptionFound = true,
} = {}) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: jobFound ? {
              id: 'job-1',
              title: 'Deposition of Bianca Perez',
              case_name: 'Perez v. Ugalde',
              case_number: '2025-CI-12281',
              deposition_date: '2026-03-11',
              firm_id: firmId,
              created_by_id: ownerId,
              status: 'REVIEW_COMPLETE',
            } : null,
            error: null,
          }),
        };
      }
      if (table === 'transcriptions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: transcriptionFound ? { id: 'tx-1', status: 'CERTIFIED' } : null,
            error: null,
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { full_name: 'Miah Bardot', email: 'miah@test.com' },
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };
}

function makeAdminMock() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { full_name: 'Miah Bardot', email: 'miah@test.com' },
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };
}

function makeRequest(body: Record<string, any>) {
  return new NextRequest('http://localhost/api/jobs/job-1/deliver', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('Deliver Route - POST /api/jobs/[id]/deliver', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    generateDownloadTokenMock.mockResolvedValue('a'.repeat(64));
    sendEmailMock.mockResolvedValue({ id: 'email-1', success: true });
    createAdminClientMock.mockReturnValue(makeAdminMock());
  });

  it('returns 400 when transcriptId is missing', async () => {
    const supabase = makeSupabaseMock();
    const route = await import('@/app/api/jobs/[id]/deliver/route');

    const req = makeRequest({ orderingEmail: 'atty@law.com', orderingName: 'Jane' });
    const res = await route.POST(req, {
      user: { id: 'reporter-1', role: 'REPORTER', firm_id: 'firm-1' },
      supabase,
      params: { id: 'job-1' },
    } as any);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('required');
  });

  it('returns 400 when orderingEmail is missing', async () => {
    const supabase = makeSupabaseMock();
    const route = await import('@/app/api/jobs/[id]/deliver/route');

    const req = makeRequest({ transcriptId: 'tx-1', orderingName: 'Jane' });
    const res = await route.POST(req, {
      user: { id: 'reporter-1', role: 'REPORTER', firm_id: 'firm-1' },
      supabase,
      params: { id: 'job-1' },
    } as any);

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email format', async () => {
    const supabase = makeSupabaseMock();
    const route = await import('@/app/api/jobs/[id]/deliver/route');

    const req = makeRequest({ transcriptId: 'tx-1', orderingEmail: 'not-an-email', orderingName: 'Jane' });
    const res = await route.POST(req, {
      user: { id: 'reporter-1', role: 'REPORTER', firm_id: 'firm-1' },
      supabase,
      params: { id: 'job-1' },
    } as any);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid email');
  });

  it('returns 404 when job is not found', async () => {
    const supabase = makeSupabaseMock({ jobFound: false });
    const route = await import('@/app/api/jobs/[id]/deliver/route');

    const req = makeRequest({ transcriptId: 'tx-1', orderingEmail: 'atty@law.com', orderingName: 'Jane' });
    const res = await route.POST(req, {
      user: { id: 'reporter-1', role: 'REPORTER', firm_id: 'firm-1' },
      supabase,
      params: { id: 'job-1' },
    } as any);

    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not owner, not same firm, and not admin', async () => {
    const supabase = makeSupabaseMock({ ownerId: 'reporter-1', firmId: 'firm-1' });
    const route = await import('@/app/api/jobs/[id]/deliver/route');

    const req = makeRequest({ transcriptId: 'tx-1', orderingEmail: 'atty@law.com', orderingName: 'Jane' });
    const res = await route.POST(req, {
      user: { id: 'other-user', role: 'REPORTER', firm_id: 'firm-OTHER' },
      supabase,
      params: { id: 'job-1' },
    } as any);

    expect(res.status).toBe(403);
  });

  it('happy path: returns 200 with downloadUrl and emailSent true', async () => {
    const supabase = makeSupabaseMock();
    const route = await import('@/app/api/jobs/[id]/deliver/route');

    const req = makeRequest({ transcriptId: 'tx-1', orderingEmail: 'atty@law.com', orderingName: 'Jennifer Durbin' });
    const res = await route.POST(req, {
      user: { id: 'reporter-1', role: 'REPORTER', firm_id: 'firm-1' },
      supabase,
      params: { id: 'job-1' },
    } as any);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.emailSent).toBe(true);
    expect(json.downloadUrl).toContain('a'.repeat(64));
    expect(json.newStatus).toBe('COMPLETED');
    expect(generateDownloadTokenMock).toHaveBeenCalledWith('job-1', 'tx-1', 'atty@law.com', 72);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it('returns 200 with emailSent false when email fails', async () => {
    sendEmailMock.mockResolvedValueOnce({ id: '', success: false, error: 'Send failed' });
    const supabase = makeSupabaseMock();
    const route = await import('@/app/api/jobs/[id]/deliver/route');

    const req = makeRequest({ transcriptId: 'tx-1', orderingEmail: 'atty@law.com', orderingName: 'Jane' });
    const res = await route.POST(req, {
      user: { id: 'reporter-1', role: 'REPORTER', firm_id: 'firm-1' },
      supabase,
      params: { id: 'job-1' },
    } as any);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.emailSent).toBe(false);
    expect(json.downloadUrl).toBeDefined();
  });

  it('returns 404 when transcript is not found', async () => {
    const supabase = makeSupabaseMock({ transcriptionFound: false });
    const route = await import('@/app/api/jobs/[id]/deliver/route');

    const req = makeRequest({ transcriptId: 'tx-missing', orderingEmail: 'atty@law.com', orderingName: 'Jane' });
    const res = await route.POST(req, {
      user: { id: 'reporter-1', role: 'REPORTER', firm_id: 'firm-1' },
      supabase,
      params: { id: 'job-1' },
    } as any);

    expect(res.status).toBe(404);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const createSupabaseServerClientMock = vi.fn();
const createAdminClientMock = vi.fn();
const sendEmailMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock('@/lib/email', () => ({
  sendEmail: sendEmailMock,
  recordingNeededEmail: vi.fn((data: any) => ({
    to: data.recipientEmail,
    subject: `Recording needed - ${data.deponentName}`,
    html: '<p>test</p>',
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

function buildServerSupabase(stuckJobs: any[] = []) {
  return {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: stuckJobs, error: null }),
      })),
    })),
  };
}

function buildAdminSupabase(overdueJobs: any[] = []) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
          then: (resolve: any) => resolve({ data: overdueJobs, error: null }),
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

describe('Cron Cleanup Route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
    process.env.NODE_ENV = 'test';
    sendEmailMock.mockResolvedValue({ id: 'email-1', success: true });
  });

  it('returns 401 when CRON_SECRET is set but authorization header is wrong', async () => {
    process.env.CRON_SECRET = 'test-secret';
    createSupabaseServerClientMock.mockResolvedValue(buildServerSupabase());

    const { GET } = await import('@/app/api/cron/cleanup/route');
    const req = new NextRequest('http://localhost/api/cron/cleanup', {
      headers: { authorization: 'Bearer wrong-secret' },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('succeeds with correct CRON_SECRET', async () => {
    process.env.CRON_SECRET = 'test-secret';
    createSupabaseServerClientMock.mockResolvedValue(buildServerSupabase());
    createAdminClientMock.mockReturnValue(buildAdminSupabase());

    const { GET } = await import('@/app/api/cron/cleanup/route');
    const req = new NextRequest('http://localhost/api/cron/cleanup', {
      headers: { authorization: 'Bearer test-secret' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.results.recordingReminders).toBe(0);
  });

  it('sends recording needed emails for overdue jobs', async () => {
    const overdueJobs = [
      {
        id: 'job-overdue-1',
        title: 'Deposition of Jane Doe',
        case_name: 'Doe v. Smith',
        case_number: '2025-CI-99999',
        deposition_date: '2026-03-01',
        firm_id: 'firm-1',
        reporter: { id: 'reporter-1', full_name: 'Miah Bardot', email: 'miah@test.com' },
      },
    ];

    createSupabaseServerClientMock.mockResolvedValue(buildServerSupabase());
    createAdminClientMock.mockReturnValue(buildAdminSupabase(overdueJobs));

    const { GET } = await import('@/app/api/cron/cleanup/route');
    const req = new NextRequest('http://localhost/api/cron/cleanup');

    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.results.recordingReminders).toBe(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it('reports stuck job count in results', async () => {
    const stuckJobs = [{ id: 'stuck-1' }, { id: 'stuck-2' }];
    createSupabaseServerClientMock.mockResolvedValue(buildServerSupabase(stuckJobs));
    createAdminClientMock.mockReturnValue(buildAdminSupabase());

    const { GET } = await import('@/app/api/cron/cleanup/route');
    const req = new NextRequest('http://localhost/api/cron/cleanup');

    const res = await GET(req);
    const json = await res.json();
    expect(json.results.failedJobsReset).toBe(2);
  });
});

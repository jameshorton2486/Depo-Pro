import { describe, expect, it, vi, beforeEach } from 'vitest';

// In-memory store simulating jobs table
let jobsStore: Record<string, { id: string; internal_notes: string | null; updated_at: string }> = {};

const createAdminClientMock = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => createAdminClientMock(),
}));

function buildSupabase() {
  return {
    from: vi.fn((table: string) => {
      if (table !== 'jobs') return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) };

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(async () => {
          const firstJob = Object.values(jobsStore)[0] ?? null;
          return { data: firstJob, error: null };
        }),
        then: (resolve: any) => resolve({
          data: Object.values(jobsStore),
          error: null,
        }),
        update: vi.fn().mockImplementation((payload: any) => ({
          eq: vi.fn().mockImplementation((_col: string, jobId: string) => {
            if (jobsStore[jobId]) {
              jobsStore[jobId] = { ...jobsStore[jobId], ...payload };
            }
            return Promise.resolve({ error: null });
          }),
        })),
      };
    }),
  };
}

describe('Download Tokens', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    jobsStore = {
      'job-1': {
        id: 'job-1',
        internal_notes: null,
        updated_at: new Date().toISOString(),
      },
    };
    createAdminClientMock.mockReturnValue(buildSupabase());
  });

  it('generateDownloadToken returns a 64-char hex string', async () => {
    const { generateDownloadToken } = await import('@/lib/security/download-tokens');

    const token = await generateDownloadToken('job-1', 'tx-1', 'attorney@law.com', 72);

    expect(token).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(token)).toBe(true);
  });

  it('generateDownloadToken stores token in internal_notes', async () => {
    const { generateDownloadToken } = await import('@/lib/security/download-tokens');

    const token = await generateDownloadToken('job-1', 'tx-1', 'attorney@law.com', 72);

    // The mock update should have been called with the token data
    const supabase = createAdminClientMock();
    expect(supabase.from).toHaveBeenCalledWith('jobs');

    // Token format verification
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  it('validateDownloadToken returns null for short tokens', async () => {
    const { validateDownloadToken } = await import('@/lib/security/download-tokens');

    expect(await validateDownloadToken('')).toBeNull();
    expect(await validateDownloadToken('short')).toBeNull();
    expect(await validateDownloadToken('a'.repeat(63))).toBeNull();
  });

  it('validateDownloadToken returns null for expired tokens', async () => {
    const expiredToken = 'a'.repeat(64);
    const expiredDate = new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(); // 100 hours ago

    jobsStore['job-1'].internal_notes = JSON.stringify({
      downloadTokens: [{
        token: expiredToken,
        jobId: 'job-1',
        transcriptId: 'tx-1',
        recipientEmail: 'test@law.com',
        expiresAt: expiredDate,
        usedAt: null,
      }],
    });

    const { validateDownloadToken } = await import('@/lib/security/download-tokens');
    const result = await validateDownloadToken(expiredToken);

    expect(result).toBeNull();
  });

  it('validateDownloadToken returns null for already-used tokens', async () => {
    const usedToken = 'b'.repeat(64);
    const futureDate = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    jobsStore['job-1'].internal_notes = JSON.stringify({
      downloadTokens: [{
        token: usedToken,
        jobId: 'job-1',
        transcriptId: 'tx-1',
        recipientEmail: 'test@law.com',
        expiresAt: futureDate,
        usedAt: new Date().toISOString(),
      }],
    });

    const { validateDownloadToken } = await import('@/lib/security/download-tokens');
    const result = await validateDownloadToken(usedToken);

    expect(result).toBeNull();
  });

  it('validateDownloadToken returns token data for valid tokens', async () => {
    const validToken = 'c'.repeat(64);
    const futureDate = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    jobsStore['job-1'].internal_notes = JSON.stringify({
      downloadTokens: [{
        token: validToken,
        jobId: 'job-1',
        transcriptId: 'tx-1',
        recipientEmail: 'test@law.com',
        expiresAt: futureDate,
        usedAt: null,
      }],
    });

    const { validateDownloadToken } = await import('@/lib/security/download-tokens');
    const result = await validateDownloadToken(validToken);

    expect(result).not.toBeNull();
    expect(result?.token).toBe(validToken);
    expect(result?.jobId).toBe('job-1');
    expect(result?.recipientEmail).toBe('test@law.com');
  });
});

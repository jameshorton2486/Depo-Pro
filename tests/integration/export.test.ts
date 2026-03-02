import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getCurrentUserMock = vi.fn();
const createSupabaseServerClientMock = vi.fn();
const getTranscriptForExportMock = vi.fn();
const getTranscriptEditsMock = vi.fn();
const exportTranscriptMock = vi.fn();
const canExportFormatMock = vi.fn();
const canUseProfileMock = vi.fn();
const getExportProfileMock = vi.fn();
const checkUserRateLimitMock = vi.fn();
const rateLimitResponseMock = vi.fn();
const useQuotaMock = vi.fn();
const createAuditLogMock = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock('@/lib/supabase/queries/transcripts', () => ({
  getTranscriptForExport: getTranscriptForExportMock,
  getTranscriptEdits: getTranscriptEditsMock,
}));

vi.mock('@/lib/export', () => ({
  exportTranscript: exportTranscriptMock,
}));

vi.mock('@/lib/export/permissions', () => ({
  canExportFormat: canExportFormatMock,
  canUseProfile: canUseProfileMock,
}));

vi.mock('@/lib/export/profiles', () => ({
  getExportProfile: getExportProfileMock,
}));

vi.mock('@/lib/rate-limit-service', () => ({
  checkUserRateLimit: checkUserRateLimitMock,
  rateLimitResponse: rateLimitResponseMock,
}));

vi.mock('@/lib/cost-control-service', () => ({
  useQuota: useQuotaMock,
}));

vi.mock('@/lib/audit-service', () => ({
  createAuditLog: createAuditLogMock,
  AuditAction: { TRANSCRIPT_EXPORTED: 'TRANSCRIPT_EXPORTED' },
  AuditTargetType: { TRANSCRIPT: 'TRANSCRIPT' },
}));

describe('Export Integration', () => {
  let flaggedWordsRows: Array<{ word_index: number; corrected_word: string }> = [];

  function makeSupabaseClientForExport() {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({ data: flaggedWordsRows, error: null }),
    };
    return {
      from: vi.fn(() => chain),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    flaggedWordsRows = [];
    createSupabaseServerClientMock.mockResolvedValue(makeSupabaseClientForExport());
    checkUserRateLimitMock.mockReturnValue({ allowed: true });
    useQuotaMock.mockResolvedValue({ allowed: true });
    canExportFormatMock.mockReturnValue(true);
    canUseProfileMock.mockReturnValue(true);
    getExportProfileMock.mockReturnValue(null);
    createAuditLogMock.mockResolvedValue(undefined);
    exportTranscriptMock.mockResolvedValue({
      buffer: Buffer.from('file'),
      filename: 'transcript.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  });

  it('returns 401 when user is not authenticated', async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);
    const route = await import('@/app/api/transcripts/[id]/export/route');
    const req = new NextRequest('http://localhost/api/transcripts/t1/export?format=docx');
    const res = await route.GET(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(401);
  });

  it('applies edit history then flagged corrections before export', async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: 'user-1',
      role: 'REPORTER',
      firmId: 'firm-1',
      email: 'test@example.com',
    });

    getTranscriptForExportMock.mockResolvedValueOnce({
      id: 'tx-1',
      full_transcript: 'alpha beta gamma',
      words: [{ word: 'alpha' }, { word: 'beta' }, { word: 'gamma' }],
      flagged_segments: {
        reviewSession: {
          corrections: { '1': 'BETA_REVIEW' },
        },
      },
      job: {
        created_by_id: 'user-1',
        firm_id: 'firm-1',
        title: 'Case A',
        case_number: 'CASE-1',
        deposition_date: '2026-02-22',
        location: 'Remote',
        createdBy: { firstName: 'Test', lastName: 'User' },
        firm: { name: 'Firm 1' },
      },
    });

    // chronologicalEdits = reverse() in route, so one edit is enough here.
    getTranscriptEditsMock.mockResolvedValueOnce([
      { edited_text: 'BETA_EDIT', metadata: { wordIndex: 1 } },
    ]);

    const route = await import('@/app/api/transcripts/[id]/export/route');
    const req = new NextRequest('http://localhost/api/transcripts/t1/export?format=docx');
    const res = await route.GET(req, { params: Promise.resolve({ id: 't1' }) });

    expect(res.status).toBe(200);
    expect(exportTranscriptMock).toHaveBeenCalledTimes(1);
    const exportedText = exportTranscriptMock.mock.calls[0][0];
    expect(exportedText).toContain('alpha');
    expect(exportedText).toContain('BETA_REVIEW');
    expect(exportedText).toContain('gamma');
  });

  it('blocks disallowed export formats by role', async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: 'user-2',
      role: 'SCOPIST',
      firmId: 'firm-1',
      email: 'scopist@example.com',
    });

    canExportFormatMock.mockReturnValueOnce(false);

    getTranscriptForExportMock.mockResolvedValueOnce({
      id: 'tx-1',
      full_transcript: 'alpha beta gamma',
      words: [{ word: 'alpha' }, { word: 'beta' }, { word: 'gamma' }],
      flagged_segments: null,
      job: {
        created_by_id: 'user-1',
        firm_id: 'firm-1',
        title: 'Case A',
        case_number: 'CASE-1',
        deposition_date: '2026-02-22',
        location: 'Remote',
        createdBy: { firstName: 'Test', lastName: 'User' },
        firm: { name: 'Firm 1' },
      },
    });
    getTranscriptEditsMock.mockResolvedValueOnce([]);

    const route = await import('@/app/api/transcripts/[id]/export/route');
    const req = new NextRequest('http://localhost/api/transcripts/t1/export?format=docx');
    const res = await route.GET(req, { params: Promise.resolve({ id: 't1' }) });

    expect(res.status).toBe(403);
    expect(exportTranscriptMock).not.toHaveBeenCalled();
  });

  it('prefers flagged_words table corrections over edit history and legacy review corrections', async () => {
    flaggedWordsRows = [{ word_index: 1, corrected_word: 'BETA_TABLE' }];
    createSupabaseServerClientMock.mockResolvedValueOnce(makeSupabaseClientForExport());

    getCurrentUserMock.mockResolvedValueOnce({
      id: 'user-1',
      role: 'REPORTER',
      firmId: 'firm-1',
      email: 'test@example.com',
    });

    getTranscriptForExportMock.mockResolvedValueOnce({
      id: 'tx-1',
      full_transcript: 'alpha beta gamma',
      words: [{ word: 'alpha' }, { word: 'beta' }, { word: 'gamma' }],
      flagged_segments: {
        reviewSession: {
          corrections: { '1': 'BETA_REVIEW' },
        },
      },
      job: {
        created_by_id: 'user-1',
        firm_id: 'firm-1',
        title: 'Case A',
        case_number: 'CASE-1',
        deposition_date: '2026-02-22',
        location: 'Remote',
        createdBy: { firstName: 'Test', lastName: 'User' },
        firm: { name: 'Firm 1' },
      },
    });

    getTranscriptEditsMock.mockResolvedValueOnce([
      { edited_text: 'BETA_EDIT', metadata: { wordIndex: 1 } },
    ]);

    const route = await import('@/app/api/transcripts/[id]/export/route');
    const req = new NextRequest('http://localhost/api/transcripts/t1/export?format=docx');
    const res = await route.GET(req, { params: Promise.resolve({ id: 't1' }) });

    expect(res.status).toBe(200);
    const exportedText = exportTranscriptMock.mock.calls[0][0];
    expect(exportedText).toContain('BETA_TABLE');
    expect(exportedText).not.toContain('BETA_EDIT');
    expect(exportedText).not.toContain('BETA_REVIEW');
  });
});

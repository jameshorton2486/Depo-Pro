import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getCurrentUserMock = vi.fn();
const createSupabaseServerClientMock = vi.fn();
const getTranscriptForExportMock = vi.fn();
const getTranscriptEditsMock = vi.fn();
const exportTranscriptMock = vi.fn();
const runQualityGateMock = vi.fn();

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
  canExportFormat: vi.fn().mockReturnValue(true),
  canUseProfile: vi.fn().mockReturnValue(true),
}));
vi.mock('@/lib/export/profiles', () => ({
  getExportProfile: vi.fn().mockReturnValue(null),
}));
vi.mock('@/lib/rate-limit-service', () => ({
  checkUserRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/cost-control-service', () => ({
  useQuota: vi.fn().mockResolvedValue({ allowed: true }),
}));
vi.mock('@/lib/audit-service', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  AuditAction: { TRANSCRIPT_EXPORTED: 'TRANSCRIPT_EXPORTED' },
  AuditTargetType: { TRANSCRIPT: 'TRANSCRIPT' },
}));
vi.mock('@/lib/error-capture', () => ({
  captureError: vi.fn(),
}));

vi.mock('@/lib/transcription/formatter/quality-gate', () => ({
  runQualityGate: runQualityGateMock,
}));

describe('Export with Flagged Word Corrections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    runQualityGateMock.mockResolvedValue({
      passed: true,
      exportBlocked: false,
      checks: [],
      errors: [],
      warnings: [],
      errorCount: 0,
      warningCount: 0,
      canExportWithAcknowledgment: false,
    });
    exportTranscriptMock.mockResolvedValue({
      buffer: Buffer.from('file-content'),
      filename: 'transcript.docx',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  });

  it('applies flagged_words corrections over legacy edits', async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: 'user-1',
      role: 'REPORTER',
      firmId: 'firm-1',
      email: 'test@test.com',
    });

    getTranscriptForExportMock.mockResolvedValueOnce({
      id: 'tx-1',
      full_transcript: 'Please state your naem for the record',
      words: [
        { word: 'Please' }, { word: 'state' }, { word: 'your' },
        { word: 'naem' }, { word: 'for' }, { word: 'the' }, { word: 'record' },
      ],
      flagged_segments: null,
      job: {
        created_by_id: 'user-1', firm_id: 'firm-1', title: 'Smith v Jones',
        case_number: 'CV-2026-001', deposition_date: '2026-02-24',
        location: 'Remote', createdBy: { firstName: 'J', lastName: 'D' },
        firm: { name: 'TestFirm' },
      },
    });

    getTranscriptEditsMock.mockResolvedValueOnce([
      { edited_text: 'LEGACY_FIX', metadata: { wordIndex: 3 } },
    ]);

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'flagged_words') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            not: vi.fn().mockResolvedValue({
              data: [{ word_index: 3, corrected_word: 'name' }],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          not: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };
    createSupabaseServerClientMock.mockResolvedValueOnce(mockSupabase);

    const route = await import('@/app/api/transcripts/[id]/export/route');
    const req = new NextRequest('http://localhost/api/transcripts/tx-1/export?format=docx');
    const res = await route.GET(req, { params: Promise.resolve({ id: 'tx-1' }) });

    expect(res.status).toBe(200);
    expect(exportTranscriptMock).toHaveBeenCalledTimes(1);

    const exportedText: string = exportTranscriptMock.mock.calls[0][0];
    expect(exportedText).toContain('name');
    expect(exportedText).not.toContain('naem');
  });

  it('exports original text when no corrections exist', async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: 'user-1', role: 'REPORTER', firmId: 'firm-1', email: 'test@test.com',
    });

    getTranscriptForExportMock.mockResolvedValueOnce({
      id: 'tx-1',
      full_transcript: 'Original transcript text',
      words: [{ word: 'Original' }, { word: 'transcript' }, { word: 'text' }],
      flagged_segments: null,
      job: {
        created_by_id: 'user-1', firm_id: 'firm-1', title: 'Case',
        case_number: 'CV-1', deposition_date: '2026-02-24',
        location: 'Remote', createdBy: { firstName: 'J', lastName: 'D' },
        firm: { name: 'Firm' },
      },
    });

    getTranscriptEditsMock.mockResolvedValueOnce([]);

    const mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    };
    createSupabaseServerClientMock.mockResolvedValueOnce(mockSupabase);

    const route = await import('@/app/api/transcripts/[id]/export/route');
    const req = new NextRequest('http://localhost/api/transcripts/tx-1/export?format=docx');
    const res = await route.GET(req, { params: Promise.resolve({ id: 'tx-1' }) });

    expect(res.status).toBe(200);
    const exportedText: string = exportTranscriptMock.mock.calls[0][0];
    expect(exportedText).toBe('Original transcript text');
  });
});

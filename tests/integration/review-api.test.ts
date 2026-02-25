import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getCurrentUserMock = vi.fn();
const createSupabaseServerClientMock = vi.fn();
const isJobLockedByOtherMock = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock('@/lib/supabase/queries/locks', () => ({
  isJobLockedByOther: isJobLockedByOtherMock,
}));

vi.mock('@/lib/middleware/withRouteProtection', () => ({
  withRouteProtection: (_options: unknown, handler: any) => handler,
}));

vi.mock('@/lib/error-capture', () => ({
  captureError: vi.fn(),
  captureWarning: vi.fn(),
}));

vi.mock('@/lib/services/correction-logger', () => ({
  logCorrection: vi.fn().mockResolvedValue(undefined),
  getWordContext: vi.fn().mockReturnValue('state your'),
}));

function createMockSupabase(
  overrides: {
    flaggedWord?: any;
    transcription?: any;
    job?: any;
    updateError?: any;
  } = {}
) {
  const {
    flaggedWord = {
      id: 'fw-1',
      transcription_id: 'tx-1',
      word_index: 3,
      original_word: 'naem',
      confidence: 0.45,
      start_time: 1.1,
      end_time: 1.5,
      speaker_label: 'SPEAKER_01',
      status: 'PENDING',
      corrected_word: null,
      sort_order: 0,
    },
    transcription = {
      id: 'tx-1',
      job_id: 'job-1',
      words: [],
      utterances: [],
      updated_at: '2026-02-24T12:00:00.000Z',
    },
    job = { id: 'job-1', firm_id: 'firm-1', reporter_id: 'user-1' },
    updateError = null,
  } = overrides;

  return {
    from: vi.fn((table: string) => {
      if (table === 'flagged_words') {
        return {
          select: vi.fn((columns: string) => {
            if (columns === 'status') {
              return {
                eq: vi.fn().mockResolvedValue({
                  data: [{ status: 'PENDING' }, { status: 'CONFIRMED' }],
                  error: null,
                }),
              };
            }
            return {
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: flaggedWord, error: null }),
              }),
            };
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: updateError }),
          }),
        };
      }
      if (table === 'transcriptions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: transcription, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { updated_at: '2026-02-24T12:05:00.000Z' },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: job, error: null }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { firm_id: 'firm-1' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'transcription_edits') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {};
    }),
  };
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/jobs/job-1/review', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('Review API - PATCH /api/jobs/[id]/review', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    isJobLockedByOtherMock.mockResolvedValue(false);
  });

  it('returns 401 when unauthenticated', async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);
    const route = await import('@/app/api/jobs/[id]/review/route');
    const res = await route.PATCH(
      makeRequest({ wordId: 'fw-1', action: 'correct', correctedWord: 'name' }),
      { params: Promise.resolve({ id: 'job-1' }) }
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when wordId is missing', async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: 'user-1', role: 'SCOPIST' });
    createSupabaseServerClientMock.mockResolvedValueOnce(createMockSupabase());
    const route = await import('@/app/api/jobs/[id]/review/route');
    const res = await route.PATCH(
      makeRequest({
        action: 'correct',
        correctedWord: 'name',
        expectedUpdatedAt: '2026-02-24T12:00:00.000Z',
      }),
      { params: Promise.resolve({ id: 'job-1' }) }
    );
    expect(res.status).toBe(400);
  });

  it('returns 409 for stale optimistic lock timestamp', async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: 'user-1', role: 'SCOPIST' });
    createSupabaseServerClientMock.mockResolvedValueOnce(
      createMockSupabase({
        transcription: {
          id: 'tx-1',
          job_id: 'job-1',
          words: [],
          utterances: [],
          updated_at: '2026-02-24T13:00:00.000Z',
        },
      })
    );
    const route = await import('@/app/api/jobs/[id]/review/route');
    const res = await route.PATCH(
      makeRequest({
        wordId: 'fw-1',
        action: 'correct',
        correctedWord: 'name',
        expectedUpdatedAt: '2026-02-24T12:00:00.000Z',
      }),
      { params: Promise.resolve({ id: 'job-1' }) }
    );
    expect(res.status).toBe(409);
  });

  it('returns 423 when job is locked by another user', async () => {
    const currentUpdatedAt = '2026-02-24T12:00:00.000Z';
    getCurrentUserMock.mockResolvedValueOnce({ id: 'user-1', role: 'SCOPIST' });
    isJobLockedByOtherMock.mockResolvedValueOnce(true);
    createSupabaseServerClientMock.mockResolvedValueOnce(
      createMockSupabase({
        transcription: {
          id: 'tx-1',
          job_id: 'job-1',
          words: [],
          utterances: [],
          updated_at: currentUpdatedAt,
        },
      })
    );
    const route = await import('@/app/api/jobs/[id]/review/route');
    const res = await route.PATCH(
      makeRequest({
        wordId: 'fw-1',
        action: 'correct',
        correctedWord: 'name',
        expectedUpdatedAt: currentUpdatedAt,
      }),
      { params: Promise.resolve({ id: 'job-1' }) }
    );
    expect(res.status).toBe(423);
  });

  it('successfully corrects a word and returns 200', async () => {
    const currentUpdatedAt = '2026-02-24T12:00:00.000Z';
    getCurrentUserMock.mockResolvedValueOnce({ id: 'user-1', role: 'SCOPIST' });
    isJobLockedByOtherMock.mockResolvedValueOnce(false);
    createSupabaseServerClientMock.mockResolvedValueOnce(
      createMockSupabase({
        transcription: {
          id: 'tx-1',
          job_id: 'job-1',
          words: [],
          utterances: [],
          updated_at: currentUpdatedAt,
        },
      })
    );
    const route = await import('@/app/api/jobs/[id]/review/route');
    const res = await route.PATCH(
      makeRequest({
        wordId: 'fw-1',
        action: 'correct',
        correctedWord: 'name',
        expectedUpdatedAt: currentUpdatedAt,
      }),
      { params: Promise.resolve({ id: 'job-1' }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.flaggedWord).toBeDefined();
  });

  it('successfully confirms a word', async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: 'user-1', role: 'SCOPIST' });
    createSupabaseServerClientMock.mockResolvedValueOnce(createMockSupabase());
    const route = await import('@/app/api/jobs/[id]/review/route');
    const res = await route.PATCH(
      makeRequest({
        wordId: 'fw-1',
        action: 'confirm',
        expectedUpdatedAt: '2026-02-24T12:00:00.000Z',
      }),
      { params: Promise.resolve({ id: 'job-1' }) }
    );
    expect(res.status).toBe(200);
  });

  it('successfully skips a word', async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: 'user-1', role: 'SCOPIST' });
    createSupabaseServerClientMock.mockResolvedValueOnce(createMockSupabase());
    const route = await import('@/app/api/jobs/[id]/review/route');
    const res = await route.PATCH(
      makeRequest({
        wordId: 'fw-1',
        action: 'skip',
        expectedUpdatedAt: '2026-02-24T12:00:00.000Z',
      }),
      { params: Promise.resolve({ id: 'job-1' }) }
    );
    expect(res.status).toBe(200);
  });
});

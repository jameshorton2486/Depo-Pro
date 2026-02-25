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

function makeSupabaseForConflict() {
  return {
    from: vi.fn((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'job-1', created_by_id: 'user-1', firm_id: 'firm-1' },
            error: null,
          }),
        };
      }
      if (table === 'transcriptions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'tx-1', updated_at: '2026-02-22T12:00:30.000Z' },
            error: null,
          }),
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

function makeSupabaseForHappyPath() {
  const edits: Array<{ word_index: number; edited_text: string | null; edit_type: string }> = [];
  const flaggedSegments = [
    { text: 'name', confidence: 0.45, start: 1.1, end: 1.5, speaker: 0, context: 'Please state your name.' },
    { text: 'occupation', confidence: 0.62, start: 2.0, end: 2.4, speaker: 0, context: 'What is your occupation?' },
  ];
  let transcriptionUpdatedAt = '2026-02-22T12:00:30.000Z';

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'job-1', created_by_id: 'user-1', firm_id: 'firm-1' },
            error: null,
          }),
        };
      }

      if (table === 'transcriptions') {
        const chain: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          update: vi.fn((payload: { updated_at: string }) => {
            transcriptionUpdatedAt = payload.updated_at;
            return chain;
          }),
          single: vi.fn().mockImplementation(async () => ({
            data: {
              id: 'tx-1',
              flagged_segments: flaggedSegments,
              status: 'COMPLETE',
              updated_at: transcriptionUpdatedAt,
            },
            error: null,
          })),
        };
        return chain;
      }

      if (table === 'transcription_edits') {
        const chain: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation(async () => ({ data: edits, error: null })),
          upsert: vi.fn((payload: { word_index: number; edited_text: string | null }) => {
            const existingIndex = edits.findIndex((e) => e.word_index === payload.word_index);
            const next = {
              word_index: payload.word_index,
              edited_text: payload.edited_text,
              edit_type: 'WORD_CORRECTION',
            };
            if (existingIndex >= 0) edits[existingIndex] = next;
            else edits.push(next);
            return Promise.resolve({ error: null });
          }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
        return chain;
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };

  return { supabase, getUpdatedAt: () => transcriptionUpdatedAt };
}

describe('Flagged Words API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns 401 when unauthenticated', async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);
    const route = await import('@/app/api/jobs/[id]/flagged-words/route');

    const req = new NextRequest('http://localhost/api/jobs/job-1/flagged-words');
    const res = await route.GET(req, { params: Promise.resolve({ id: 'job-1' }) });
    expect(res.status).toBe(401);
  });

  it('PATCH requires expectedUpdatedAt', async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: 'user-1', role: 'SCOPIST' });
    const route = await import('@/app/api/jobs/[id]/flagged-words/route');

    const req = new NextRequest('http://localhost/api/jobs/job-1/flagged-words', {
      method: 'PATCH',
      body: JSON.stringify({ wordId: 'tx-1-0', correctedText: 'corrected' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await route.PATCH(req, { params: Promise.resolve({ id: 'job-1' }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('expectedUpdatedAt');
    expect(json.code).toBe('VALIDATION_ERROR');
    expect(json.fieldErrors.expectedUpdatedAt).toBeDefined();
  });

  it('PATCH returns 409 for stale optimistic lock timestamp', async () => {
    getCurrentUserMock.mockResolvedValueOnce({ id: 'user-1', role: 'SCOPIST' });
    createSupabaseServerClientMock.mockResolvedValueOnce(makeSupabaseForConflict());
    isJobLockedByOtherMock.mockResolvedValueOnce(false);
    const route = await import('@/app/api/jobs/[id]/flagged-words/route');

    const req = new NextRequest('http://localhost/api/jobs/job-1/flagged-words', {
      method: 'PATCH',
      body: JSON.stringify({
        wordId: 'tx-1-0',
        correctedText: 'corrected',
        expectedUpdatedAt: '2026-02-22T11:59:00.000Z',
      }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await route.PATCH(req, { params: Promise.resolve({ id: 'job-1' }) });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe('CONFLICT');
    expect(typeof json.serverUpdatedAt).toBe('string');
  });

  it('GET returns flagged words and PATCH correction persists on re-fetch', async () => {
    const { supabase, getUpdatedAt } = makeSupabaseForHappyPath();
    createSupabaseServerClientMock.mockResolvedValue(supabase);
    isJobLockedByOtherMock.mockResolvedValue(false);

    const route = await import('@/app/api/jobs/[id]/flagged-words/route');

    getCurrentUserMock.mockResolvedValueOnce({ id: 'user-1', role: 'SCOPIST', firmId: 'firm-1' });
    const getBeforeReq = new NextRequest('http://localhost/api/jobs/job-1/flagged-words?filter=all');
    const getBeforeRes = await route.GET(getBeforeReq, { params: Promise.resolve({ id: 'job-1' }) });
    expect(getBeforeRes.status).toBe(200);
    const beforeJson = await getBeforeRes.json();
    expect(beforeJson.flaggedWords).toHaveLength(2);
    expect(beforeJson.stats.total).toBe(2);

    getCurrentUserMock.mockResolvedValueOnce({ id: 'user-1', role: 'SCOPIST', firmId: 'firm-1' });
    const patchReq = new NextRequest('http://localhost/api/jobs/job-1/flagged-words', {
      method: 'PATCH',
      body: JSON.stringify({
        wordId: 'tx-1-0',
        correctedText: 'NAME',
        expectedUpdatedAt: getUpdatedAt(),
      }),
      headers: { 'content-type': 'application/json' },
    });
    const patchRes = await route.PATCH(patchReq, { params: Promise.resolve({ id: 'job-1' }) });
    expect(patchRes.status).toBe(200);

    getCurrentUserMock.mockResolvedValueOnce({ id: 'user-1', role: 'SCOPIST', firmId: 'firm-1' });
    const getAfterReq = new NextRequest('http://localhost/api/jobs/job-1/flagged-words?filter=reviewed');
    const getAfterRes = await route.GET(getAfterReq, { params: Promise.resolve({ id: 'job-1' }) });
    expect(getAfterRes.status).toBe(200);
    const afterJson = await getAfterRes.json();
    expect(afterJson.flaggedWords).toHaveLength(1);
    expect(afterJson.flaggedWords[0].correctedTo).toBe('NAME');
    expect(afterJson.flaggedWords[0].isReviewed).toBe(true);
  });

  it('PATCH rejects unauthorized roles', async () => {
    const { supabase } = makeSupabaseForHappyPath();
    createSupabaseServerClientMock.mockResolvedValueOnce(supabase);
    getCurrentUserMock.mockResolvedValueOnce({ id: 'attorney-1', role: 'ATTORNEY', firmId: 'firm-1' });
    const route = await import('@/app/api/jobs/[id]/flagged-words/route');

    const req = new NextRequest('http://localhost/api/jobs/job-1/flagged-words', {
      method: 'PATCH',
      body: JSON.stringify({
        wordId: 'tx-1-0',
        correctedText: 'NAME',
        expectedUpdatedAt: '2026-02-22T12:00:30.000Z',
      }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await route.PATCH(req, { params: Promise.resolve({ id: 'job-1' }) });
    expect(res.status).toBe(403);
  });
});

/**
 * Pre-flight summary:
 * - The current GET flagged-word API is app/api/jobs/[id]/flagged-words/route.ts, not the older /api/transcriptions/... path in the prompt.
 * - Mutations for CORRECT / CONFIRM / SKIP currently flow through app/api/jobs/[id]/review/route.ts.
 * - Supabase review data uses "flagged_words", "transcription_edits", and "transcriptions".
 * - The review UI sync path is ReviewClientNew -> LowConfidencePanel + SyncedTranscriptViewer.
 * - Known bug under test: app/api/jobs/[id]/flagged-words/route.ts currently permits an unrelated SCOPIST to PATCH edits outside their assignment/firm scope; the authorization assertion below documents that defect.
 */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getCurrentUserMock = vi.fn();
const createSupabaseServerClientMock = vi.fn();
const isJobLockedByOtherMock = vi.fn();
const logCorrectionMock = vi.fn();

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
  withRouteProtection: (_opts: unknown, handler: any) => handler,
}));

vi.mock('@/lib/error-capture', () => ({
  captureError: vi.fn(),
}));

vi.mock('@/lib/services/correction-logger', () => ({
  logCorrection: logCorrectionMock,
  getWordContext: vi.fn((_words: any[], index: number, direction: number) =>
    direction < 0 ? `before-${index}` : `after-${index}`,
  ),
}));

function createApiState() {
  return {
    job: {
      id: 'job-1',
      created_by_id: 'reporter-1',
      reporter_id: 'reporter-1',
      firm_id: 'firm-1',
    },
    profiles: [
      { id: 'scopist-1', firm_id: 'firm-1' },
      { id: 'outsider-1', firm_id: 'firm-2' },
    ],
    transcription: {
      id: 'tx-1',
      job_id: 'job-1',
      updated_at: '2026-03-09T12:00:00.000Z',
      flagged_segments: [
        { text: 'Miyamardeau', confidence: 0.38, start: 1.04, end: 1.44, speaker: 1, context: 'Please state your name Miyamardeau' },
        { text: 'record', confidence: 0.74, start: 2.04, end: 2.44, speaker: 1, context: 'for the record today' },
        { text: 'Bardot', confidence: 0.83, start: 3.04, end: 3.44, speaker: 0, context: 'Miah Bardot appeared' },
      ],
      words: [
        { word: 'Please', start: 0, end: 0.4, confidence: 0.99, speaker: 0 },
        { word: 'state', start: 0.4, end: 0.8, confidence: 0.97, speaker: 0 },
        { word: 'your', start: 0.8, end: 1.0, confidence: 0.96, speaker: 0 },
        { word: 'Miyamardeau', start: 1.04, end: 1.44, confidence: 0.38, speaker: 1 },
      ],
      utterances: [],
    },
    flagged_words: [
      {
        id: 'fw-1',
        transcription_id: 'tx-1',
        word_index: 3,
        original_word: 'Miyamardeau',
        confidence: 0.38,
        start_time: 1.04,
        end_time: 1.44,
        speaker_label: 'SPEAKER_01',
        status: 'PENDING',
        corrected_word: null,
        reviewed_by: null,
        reviewed_at: null,
      },
      {
        id: 'fw-2',
        transcription_id: 'tx-1',
        word_index: 7,
        original_word: 'record',
        confidence: 0.74,
        start_time: 2.04,
        end_time: 2.44,
        speaker_label: 'SPEAKER_01',
        status: 'PENDING',
        corrected_word: null,
        reviewed_by: null,
        reviewed_at: null,
      },
    ],
    transcription_edits: [] as Array<Record<string, any>>,
  };
}

function createSupabase(state: ReturnType<typeof createApiState>) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: state.job, error: null }),
        };
      }

      if (table === 'profiles') {
        const chain: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn((column: string, value: string) => {
            chain._match = state.profiles.find((profile) => profile[column as 'id'] === value) ?? null;
            return chain;
          }),
          single: vi.fn(async () => ({ data: chain._match ?? null, error: null })),
        };
        return {
          ...chain,
        };
      }

      if (table === 'transcriptions') {
        const chain: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => ({ data: state.transcription, error: null })),
          update: vi.fn((payload: Record<string, any>) => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => {
                  state.transcription = { ...state.transcription, ...payload };
                  return {
                    data: { updated_at: state.transcription.updated_at },
                    error: null,
                  };
                }),
              })),
            })),
          })),
        };
        return chain;
      }

      if (table === 'transcription_edits') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn(async () => ({ data: state.transcription_edits, error: null })),
          upsert: vi.fn(async (payload: Record<string, any>) => {
            const existingIndex = state.transcription_edits.findIndex(
              (edit) =>
                edit.transcription_id === payload.transcription_id &&
                edit.word_index === payload.word_index,
            );
            if (existingIndex >= 0) {
              state.transcription_edits[existingIndex] = {
                ...state.transcription_edits[existingIndex],
                ...payload,
              };
            } else {
              state.transcription_edits.push(payload);
            }
            return { data: payload, error: null };
          }),
          insert: vi.fn(async (payload: Record<string, any>) => {
            state.transcription_edits.push(payload);
            return { data: payload, error: null };
          }),
        };
      }

      if (table === 'flagged_words') {
        const chain: any = {
          select: vi.fn((columns?: string) => {
            if (columns === 'status') {
              return {
                eq: vi.fn(async () => ({
                  data: state.flagged_words.map((word) => ({ status: word.status })),
                  error: null,
                })),
              };
            }
            return chain;
          }),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => ({
            data: state.flagged_words.find((word) => word.id === 'fw-1') ?? null,
            error: null,
          })),
          update: vi.fn((payload: Record<string, any>) => ({
            eq: vi.fn(async (_column: string, value: string) => {
              state.flagged_words = state.flagged_words.map((word) =>
                word.id === value ? { ...word, ...payload } : word,
              );
              return { data: null, error: null };
            }),
          })),
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
}

function makeReviewRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/jobs/job-1/review', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function renderUi(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe('Flagged word correction integration coverage', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = vi.fn();
    }
    getCurrentUserMock.mockResolvedValue({ id: 'scopist-1', role: 'SCOPIST', firmId: 'firm-1' });
    isJobLockedByOtherMock.mockResolvedValue(false);
  });

  it('GET returns pending words sorted by ascending confidence and returns empty arrays gracefully', async () => {
    const state = createApiState();
    createSupabaseServerClientMock.mockResolvedValue(createSupabase(state));

    const route = await import('@/app/api/jobs/[id]/flagged-words/route');

    const response = await route.GET(
      new NextRequest('http://localhost/api/jobs/job-1/flagged-words?filter=pending&sort=confidence'),
      { params: { id: 'job-1' }, user: await getCurrentUserMock(), supabase: await createSupabaseServerClientMock() },
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.flaggedWords.map((word: any) => word.confidence)).toEqual([0.38, 0.74, 0.83]);
    expect(json.flaggedWords[0]).toMatchObject({
      word: 'Miyamardeau',
      confidence: 0.38,
      start: 1.04,
      end: 1.44,
      speaker: 1,
      context: 'Please state your name Miyamardeau',
      isReviewed: false,
    });

    state.transcription.flagged_segments = [];
    const emptyResponse = await route.GET(
      new NextRequest('http://localhost/api/jobs/job-1/flagged-words'),
      { params: { id: 'job-1' }, user: await getCurrentUserMock(), supabase: await createSupabaseServerClientMock() },
    );
    const emptyJson = await emptyResponse.json();
    expect(emptyResponse.status).toBe(200);
    expect(emptyJson.flaggedWords).toEqual([]);
  });

  it('PATCH review actions persist corrected, confirmed, and skipped status changes', async () => {
    const state = createApiState();
    createSupabaseServerClientMock.mockResolvedValue(createSupabase(state));
    const route = await import('@/app/api/jobs/[id]/review/route');

    const correctRes = await route.PATCH(
      makeReviewRequest({
        wordId: 'fw-1',
        action: 'correct',
        correctedWord: 'Bardot',
        expectedUpdatedAt: state.transcription.updated_at,
      }),
      { params: { id: 'job-1' }, user: await getCurrentUserMock(), supabase: await createSupabaseServerClientMock() },
    );

    expect(correctRes.status).toBe(200);
    expect(state.flagged_words[0]).toMatchObject({
      status: 'CORRECTED',
      corrected_word: 'Bardot',
      reviewed_by: 'scopist-1',
    });
    expect(state.transcription_edits[0]).toMatchObject({
      edit_type: 'WORD_CORRECTION',
      editor_id: 'scopist-1',
      original_value: 'Miyamardeau',
      new_value: 'Bardot',
    });

    const confirmRes = await route.PATCH(
      makeReviewRequest({
        wordId: 'fw-2',
        action: 'confirm',
        expectedUpdatedAt: state.transcription.updated_at,
      }),
      { params: { id: 'job-1' }, user: await getCurrentUserMock(), supabase: await createSupabaseServerClientMock() },
    );
    expect(confirmRes.status).toBe(200);
    expect(state.flagged_words[1].status).toBe('CONFIRMED');

    state.flagged_words.push({
      id: 'fw-3',
      transcription_id: 'tx-1',
      word_index: 9,
      original_word: 'today',
      confidence: 0.82,
      start_time: 4.2,
      end_time: 4.5,
      speaker_label: 'SPEAKER_00',
      status: 'PENDING',
      corrected_word: null,
      reviewed_by: null,
      reviewed_at: null,
    });

    const skipRes = await route.PATCH(
      makeReviewRequest({
        wordId: 'fw-3',
        action: 'skip',
        expectedUpdatedAt: state.transcription.updated_at,
      }),
      { params: { id: 'job-1' }, user: await getCurrentUserMock(), supabase: await createSupabaseServerClientMock() },
    );
    expect(skipRes.status).toBe(200);
    expect(state.flagged_words.find((word) => word.id === 'fw-3')?.status).toBe('SKIPPED');
    expect(logCorrectionMock).toHaveBeenCalledTimes(3);
  });

  it('rejects non-assigned or lock-blocked reviewers and leaves edit history unchanged', async () => {
    const outsiderState = createApiState();
    createSupabaseServerClientMock.mockResolvedValue(createSupabase(outsiderState));
    getCurrentUserMock.mockResolvedValueOnce({ id: 'outsider-1', role: 'SCOPIST', firmId: 'firm-2' });
    const flaggedRoute = await import('@/app/api/jobs/[id]/flagged-words/route');

    const forbiddenRes = await flaggedRoute.PATCH(
      new NextRequest('http://localhost/api/jobs/job-1/flagged-words', {
        method: 'PATCH',
        body: JSON.stringify({
          wordId: 'tx-1-0',
          correctedText: 'Bardot',
          expectedUpdatedAt: outsiderState.transcription.updated_at,
        }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'job-1' }, user: { id: 'outsider-1', role: 'SCOPIST', firmId: 'firm-2' }, supabase: await createSupabaseServerClientMock() },
    );
    expect(forbiddenRes.status).toBe(403);

    const lockState = createApiState();
    createSupabaseServerClientMock.mockResolvedValue(createSupabase(lockState));
    isJobLockedByOtherMock.mockResolvedValueOnce(true);
    const reviewRoute = await import('@/app/api/jobs/[id]/review/route');
    const lockedRes = await reviewRoute.PATCH(
      makeReviewRequest({
        wordId: 'fw-1',
        action: 'correct',
        correctedWord: 'Bardot',
        expectedUpdatedAt: lockState.transcription.updated_at,
      }),
      { params: { id: 'job-1' }, user: { id: 'scopist-1', role: 'SCOPIST', firmId: 'firm-1' }, supabase: await createSupabaseServerClientMock() },
    );

    expect([403, 423]).toContain(lockedRes.status);
    expect(lockState.transcription_edits).toEqual([]);
  });

  it('highlights the active transcript word when current audio time matches its range', async () => {
    const { SyncedTranscriptViewer } = await import('@/components/transcripts/synced-transcript-viewer');
    const { container, unmount } = renderUi(
      React.createElement(SyncedTranscriptViewer, {
        segments: [
          {
            speaker: 0,
            start: 0,
            end: 2,
            words: [
              { word: 'Please', punctuated_word: 'Please', start: 0, end: 0.3, confidence: 0.99, speaker: 0 },
              { word: 'state', punctuated_word: 'state', start: 0.4, end: 0.7, confidence: 0.97, speaker: 0 },
              { word: 'your', punctuated_word: 'your', start: 0.8, end: 1.0, confidence: 0.96, speaker: 0 },
              { word: 'name', punctuated_word: 'name', start: 1.04, end: 1.4, confidence: 0.45, speaker: 0 },
            ],
          },
        ],
        currentTime: 1.04,
        onWordClick: () => {},
      }),
    );

    const spans = Array.from(container.querySelectorAll('span')).filter((span) => ['Please', 'state', 'your', 'name'].includes(span.textContent || ''));
    const active = spans.find((span) => span.className.includes('ring-blue-500'));
    expect(active?.textContent).toBe('name');
    expect(spans.filter((span) => span.className.includes('ring-blue-500'))).toHaveLength(1);

    unmount();
  });
});

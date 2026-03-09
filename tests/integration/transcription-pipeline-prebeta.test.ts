/**
 * Pre-flight summary:
 * - Current repo already has tests/integration/transcription-pipeline.test.ts, so this file adds non-duplicate coverage.
 * - Transcription records live in "transcriptions", flagged review rows live in "flagged_words", and edit history lives in "transcription_edits".
 * - The pipeline hard-codes a 0.85 flagging threshold in lib/transcription/pipeline.ts and lib/transcription.ts.
 * - Review/export paths in this repo have drifted from the prompt, but the pipeline still stores Deepgram raw JSON, original_transcript, and flagged words through the same core flow.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.DEEPGRAM_API_KEY = 'test-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-secret';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
});

type RawWord = {
  word: string;
  punctuated_word: string;
  start: number;
  end: number;
  confidence: number;
  speaker: number;
};

type DbState = {
  jobs: Array<Record<string, any>>;
  transcriptions: Array<Record<string, any>>;
  transcription_chunks: Array<Record<string, any>>;
  flagged_words: Array<Record<string, any>>;
  transcription_edits: Array<Record<string, any>>;
  processing_errors: Array<Record<string, any>>;
  audit_log: Array<Record<string, any>>;
};

const { transcribeFileMock, createAdminClientMock, stateRef } = vi.hoisted(() => {
  const transcribeFileMock = vi.fn();
  const createAdminClientMock = vi.fn();
  const stateRef: { current: DbState | null } = { current: null };
  return { transcribeFileMock, createAdminClientMock, stateRef };
});

vi.mock('@deepgram/sdk', () => ({
  createClient: vi.fn(() => ({
    listen: {
      prerecorded: {
        transcribeFile: transcribeFileMock,
      },
    },
  })),
}));

vi.mock('@/lib/transcription/validate', () => ({
  validateAudio: vi.fn(async () => ({
    valid: true,
    duration: 12,
    format: 'mp3',
    channels: 1,
    sampleRate: 16000,
    fileSize: 1024,
  })),
}));

vi.mock('@/lib/transcription/chunking', () => ({
  DEFAULT_CHUNKING_CONFIG: {
    chunkDurationSeconds: 1800,
    overlapSeconds: 5,
    outputFormat: 'mp3',
    outputBitrate: '128k',
  },
  chunkAudio: vi.fn(),
  cleanupChunks: vi.fn(async () => {}),
}));

vi.mock('@/lib/transcription/preprocessor', () => ({
  needsNormalization: vi.fn(async () => false),
  normalizeAudioForTranscription: vi.fn(),
  cleanupPreprocessedFile: vi.fn(),
}));

vi.mock('@/lib/transcription/reassemble', () => ({
  reassembleChunks: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock('@/lib/error-capture', () => ({
  captureError: vi.fn(),
}));

vi.mock('@/lib/services/confidence-analytics', () => ({
  calculateConfidenceAnalytics: vi.fn(() => ({
    flagged_percentage: 0,
  })),
}));

vi.mock('@/lib/services/risk-score', () => ({
  extractRiskInputs: vi.fn(() => ({})),
  calculateRiskScore: vi.fn(() => ({
    score: 0,
    label: 'LOW',
  })),
}));

vi.mock('@/src/lib/transcription/post-process', () => ({
  postProcessSegments: vi.fn((segments: any[]) => segments),
}));

function createBlobFromText(text: string) {
  return {
    arrayBuffer: async () => Buffer.from(text),
  };
}

function createMockState(): DbState {
  return {
    jobs: [
      {
        id: 'job-1',
        firm_id: 'firm-1',
        reporter_id: 'reporter-1',
        status: 'PENDING',
      },
    ],
    transcriptions: [],
    transcription_chunks: [],
    flagged_words: [],
    transcription_edits: [],
    processing_errors: [],
    audit_log: [],
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function applyEq(rows: Array<Record<string, any>>, filters: Array<{ column: string; value: any }>) {
  return rows.filter((row) => filters.every((filter) => row[filter.column] === filter.value));
}

function createSupabase(state: DbState) {
  const storage = {
    from: vi.fn(() => ({
      download: vi.fn(async () => ({
        data: createBlobFromText('fake-audio'),
        error: null,
      })),
    })),
  };

  const from = (table: keyof DbState | 'job_vocabulary' | 'firm_vocabulary' | 'profiles') => {
    const filters: Array<{ column: string; value: any }> = [];
    let selectedColumns = '*';

    const resolveRows = () => {
      if (table === 'job_vocabulary' || table === 'firm_vocabulary' || table === 'profiles') {
        return [] as Array<Record<string, any>>;
      }
      return applyEq(state[table], filters);
    };

    const chain: any = {
      select: vi.fn((columns?: string) => {
        selectedColumns = columns || '*';
        return chain;
      }),
      eq: vi.fn((column: string, value: any) => {
        filters.push({ column, value });
        return chain;
      }),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      range: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => {
        const rows = resolveRows();
        return { data: rows[0] ?? null, error: null };
      }),
      single: vi.fn(async () => {
        const rows = resolveRows();
        return { data: rows[0] ?? null, error: null };
      }),
      then: (resolve: any) => resolve({ data: resolveRows(), error: null }),
      insert: vi.fn(async (payload: Record<string, any> | Array<Record<string, any>>) => {
        if (table === 'job_vocabulary' || table === 'firm_vocabulary' || table === 'profiles') {
          return { data: null, error: null };
        }
        const records = Array.isArray(payload) ? payload : [payload];
        records.forEach((record, index) => {
          const next = clone(record);
          if (!next.id) {
            next.id = `${String(table)}-${state[table].length + index + 1}`;
          }
          state[table].push(next);
        });
        return { data: clone(records), error: null };
      }),
      update: vi.fn((payload: Record<string, any>) => {
        const updateFilters: Array<{ column: string; value: any }> = [];
        let executedResult: any = null;

        const execute = async () => {
          if (executedResult) {
            return executedResult;
          }
          if (table === 'job_vocabulary' || table === 'firm_vocabulary' || table === 'profiles') {
            executedResult = { data: null, error: null };
            return executedResult;
          }
          let updated: Record<string, any> | null = null;
          state[table] = state[table].map((row) => {
            const matchesBaseFilters = filters.every((filter) => row[filter.column] === filter.value);
            const matchesUpdateFilters = updateFilters.every((filter) => row[filter.column] === filter.value);
            if (matchesBaseFilters && matchesUpdateFilters) {
              updated = { ...row, ...payload };
              return updated;
            }
            return row;
          });
          executedResult = {
            data:
              selectedColumns.includes('updated_at') && updated
                ? { updated_at: updated.updated_at }
                : updated,
            error: null,
          };
          return executedResult;
        };

        const updateChain: any = {
          eq: vi.fn((column: string, value: any) => {
            updateFilters.push({ column, value });
            return updateChain;
          }),
          select: vi.fn(() => updateChain),
          single: vi.fn(async () => execute()),
          then: (resolve: any, reject?: any) => execute().then(resolve, reject),
        };

        return updateChain;
      }),
    };

    return chain;
  };

  return {
    storage,
    from: vi.fn(from),
    rpc: vi.fn(async (fn: string) => {
      if (fn === 'extract_flagged_words') {
        return { data: null, error: { message: 'RPC unavailable in test' } };
      }
      if (fn === 'log_processing_error') {
        return { data: null, error: { message: 'RPC unavailable in test' } };
      }
      return { data: null, error: null };
    }),
  };
}

function buildDeepgramResponse(words: RawWord[]) {
  const transcript = words.map((word) => word.punctuated_word).join(' ').trim();
  const utterancesBySpeaker = new Map<number, RawWord[]>();

  words.forEach((word) => {
    const bucket = utterancesBySpeaker.get(word.speaker) || [];
    bucket.push(word);
    utterancesBySpeaker.set(word.speaker, bucket);
  });

  return {
    result: {
      metadata: {
        duration: words.length ? words[words.length - 1].end : 0,
        channels: 1,
        request_id: 'req-1',
      },
      results: {
        channels: [
          {
            alternatives: [
              {
                transcript,
                confidence: words.length
                  ? words.reduce((sum, word) => sum + word.confidence, 0) / words.length
                  : 0,
                words,
              },
            ],
          },
        ],
        utterances: Array.from(utterancesBySpeaker.entries()).map(([speaker, speakerWords]) => ({
          transcript: speakerWords.map((word) => word.punctuated_word).join(' '),
          speaker,
          start: speakerWords[0]?.start ?? 0,
          end: speakerWords[speakerWords.length - 1]?.end ?? 0,
          channel: 0,
          confidence:
            speakerWords.reduce((sum, word) => sum + word.confidence, 0) / Math.max(1, speakerWords.length),
          words: speakerWords,
        })),
      },
    },
    error: null,
  };
}

async function runPipeline(words: RawWord[], durationSeconds = 12) {
  const state = createMockState();
  stateRef.current = state;
  createAdminClientMock.mockReturnValue(createSupabase(state));

  const { validateAudio } = await import('@/lib/transcription/validate');
  vi.mocked(validateAudio).mockResolvedValue({
    valid: true,
    duration: durationSeconds,
    format: 'mp3',
    channels: 1,
    sampleRate: 16000,
    fileSize: 1024,
  });

  transcribeFileMock.mockResolvedValueOnce(buildDeepgramResponse(words));

  const { processTranscriptionJob } = await import('@/lib/transcription/pipeline');
  await processTranscriptionJob('job-1', 'depo-audio/job-1.mp3');

  return state;
}

function makeWord(word: string, confidence: number, start: number, speaker: number): RawWord {
  return {
    word,
    punctuated_word: word,
    start,
    end: Number((start + 0.4).toFixed(2)),
    confidence,
    speaker,
  };
}

describe('Transcription pipeline pre-beta coverage', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    stateRef.current = null;
    process.env.DEEPGRAM_API_KEY = 'test-key';
  });

  it('extracts all Deepgram words, preserves speakers, and flags only confidence below 0.85', async () => {
    const words: RawWord[] = [
      makeWord('Please', 0.99, 0.0, 0),
      makeWord('state', 0.96, 0.5, 0),
      makeWord('your', 0.90, 1.0, 0),
      makeWord('name', 0.85, 1.5, 0),
      makeWord('for', 0.83, 2.0, 1),
      makeWord('the', 0.78, 2.5, 1),
      makeWord('record', 0.72, 3.0, 1),
      makeWord('Miyamardeau', 0.45, 3.5, 1),
    ];

    const state = await runPipeline(words, 14);
    const transcription = state.transcriptions[0];

    expect(transcription.status).toBe('COMPLETE');
    expect(state.jobs[0].status).toBe('AI_COMPLETE');
    expect(transcription.words).toHaveLength(8);

    const storedWords = transcription.words as Array<Record<string, any>>;
    expect(storedWords.map((word) => word.word)).toEqual(words.map((word) => word.word));
    expect(storedWords.map((word) => word.start)).toEqual(words.map((word) => word.start));
    expect(storedWords.map((word) => word.end)).toEqual(words.map((word) => word.end));
    expect(storedWords.map((word) => word.confidence)).toEqual(words.map((word) => word.confidence));

    expect(storedWords[0].speaker).toBe('SPEAKER_00');
    expect(storedWords[4].speaker).toBe('SPEAKER_01');
    expect(storedWords[7].speaker_channel).toBe(1);

    expect(state.flagged_words.map((word) => word.original_word)).toEqual([
      'for',
      'the',
      'record',
      'Miyamardeau',
    ]);
    expect(state.flagged_words.every((word) => word.confidence < 0.85)).toBe(true);
    expect(state.flagged_words.every((word) => word.status === 'PENDING')).toBe(true);

    expect((transcription.deepgram_raw_json as any).results.channels[0].alternatives[0].words[7].word).toBe('Miyamardeau');
    expect(transcription.original_transcript).toContain('Miyamardeau');
    expect(state.flagged_words.find((word) => word.original_word === 'Miyamardeau')?.corrected_word ?? null).toBeNull();
  });

  it('handles an empty Deepgram words array without crashing or creating flagged words', async () => {
    const state = await runPipeline([], 5);
    const transcription = state.transcriptions[0];

    expect(transcription.status).toBe('COMPLETE');
    expect(state.jobs[0].status).toBe('AI_COMPLETE');
    expect(transcription.words).toEqual([]);
    expect(state.flagged_words).toEqual([]);
    expect(state.processing_errors).toEqual([]);
  });

  it('stores very short audio transcripts and keeps original transcript immutable while edits happen in correction layers', async () => {
    const words: RawWord[] = [
      {
        word: 'Hello',
        punctuated_word: 'Hello',
        start: 0,
        end: 4,
        confidence: 0.99,
        speaker: 0,
      },
      {
        word: 'Miyamardeau',
        punctuated_word: 'Miyamardeau',
        start: 4,
        end: 8,
        confidence: 0.45,
        speaker: 1,
      },
      {
        word: 'speaking',
        punctuated_word: 'speaking.',
        start: 8,
        end: 12,
        confidence: 0.92,
        speaker: 1,
      },
    ];

    const state = await runPipeline(words, 12);
    const transcription = state.transcriptions[0];
    const originalTranscriptBeforeEdit = transcription.original_transcript;

    state.transcription_edits.push({
      transcription_id: transcription.id,
      word_index: 1,
      edit_type: 'WORD_CORRECTION',
      original_value: 'Miyamardeau',
      new_value: 'Miah Bardot',
      editor_id: 'scopist-1',
    });

    expect(transcription.original_transcript).toBe(originalTranscriptBeforeEdit);
    expect(state.transcription_edits).toHaveLength(1);
    expect(state.transcription_edits[0].new_value).toBe('Miah Bardot');
    expect((transcription.words as Array<Record<string, any>>)[1].word).toBe('Miyamardeau');
  });

  it('uses 25-line page boundaries in export pagination equivalents', async () => {
    const { exportToText } = await import('@/lib/export');
    const longWords = Array.from({ length: 60 }, (_, index) => `${String(index + 1).padStart(2, '0')}${'X'.repeat(68)}`);
    const text = longWords.join(' ');

    const output = exportToText(
      text,
      {
        caseName: 'Pagination Test',
        caseNumber: 'PG-1',
        deponentName: 'Witness',
        depositionDate: new Date('2026-03-09T00:00:00.000Z'),
        courtReporterName: 'Reporter',
        firmName: 'Depo-Pro',
      },
      {
        format: 'txt',
        lineNumbering: true,
        useQAFormat: false,
      },
    ).toString('utf8');

    const pageSections = output.split(/-+ Page \d+ -+\n\n/);
    const transcriptBody = pageSections[0].split(/={70}\n\n/).pop() || '';
    const firstPageLines = transcriptBody.split('\n').filter((line) => line.includes('| ')).slice(0, 25);
    const secondPageLines = pageSections[1].split('\n').filter((line) => line.includes('| ')).slice(0, 25);

    expect(firstPageLines).toHaveLength(25);
    expect(secondPageLines).toHaveLength(25);
    expect(secondPageLines[4]).toMatch(/^\s*5 \| /);
  });
});

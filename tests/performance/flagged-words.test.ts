/**
 * tests/performance/flagged-words.test.ts
 *
 * Performance tests for flagged-word extraction logic.
 *
 * Generates an in-memory 72,000-word mock transcript (≈ 8-hour deposition)
 * and validates that the core filtering, context-extraction, and sort logic
 * completes within acceptable time bounds — no real DB involved.
 */

import { describe, expect, it, beforeAll } from 'vitest';

// ---------------------------------------------------------------------------
// Types (mirrors what the pipeline produces)
// ---------------------------------------------------------------------------

interface TranscriptWord {
  word: string;
  confidence: number;
  start: number;
  end: number;
  speaker: number;
  word_index: number;
}

interface FlaggedWord {
  word_index: number;
  original_word: string;
  confidence: number;
  start_time: number;
  end_time: number;
  speaker_label: string;
  status: 'PENDING' | 'CORRECTED' | 'CONFIRMED' | 'SKIPPED';
  context_before: string;
  context_after: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_WORDS = 72_000;      // ~8-hour deposition
const CONFIDENCE_THRESHOLD = 0.85;
const CONTEXT_WINDOW = 5;        // words either side

// Known distribution: every 7th word is low-confidence (indices 0, 7, 14, ...)
const LOW_CONF_INTERVAL = 7;
const EXPECTED_FLAGGED_COUNT = Math.floor((TOTAL_WORDS - 1) / LOW_CONF_INTERVAL) + 1;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a deterministic mock transcript word array. */
function generateTranscript(count: number): TranscriptWord[] {
  const words: TranscriptWord[] = [];
  for (let i = 0; i < count; i++) {
    const isLowConf = i % LOW_CONF_INTERVAL === 0;
    words.push({
      word: `word${i}`,
      confidence: isLowConf ? 0.5 + (i % 30) / 100 : 0.9 + (i % 10) / 100,
      start: i * 0.5,
      end: i * 0.5 + 0.4,
      speaker: i % 3,
      word_index: i,
    });
  }
  return words;
}

/** Extract context window (returns a space-joined string). */
function extractContext(words: TranscriptWord[], index: number, direction: -1 | 1): string {
  const contextWords: string[] = [];
  for (let d = 1; d <= CONTEXT_WINDOW; d++) {
    const idx = index + direction * d;
    if (idx >= 0 && idx < words.length) {
      contextWords.push(words[idx].word);
    }
  }
  return direction === -1 ? contextWords.reverse().join(' ') : contextWords.join(' ');
}

/** Core extraction logic: filter low-confidence words and build FlaggedWord records. */
function extractFlaggedWords(
  words: TranscriptWord[],
  existingReviewed: Map<number, 'CORRECTED' | 'CONFIRMED' | 'SKIPPED'>
): FlaggedWord[] {
  const flagged: FlaggedWord[] = [];

  for (const w of words) {
    if (w.confidence >= CONFIDENCE_THRESHOLD) continue;

    const existingStatus = existingReviewed.get(w.word_index);
    flagged.push({
      word_index: w.word_index,
      original_word: w.word,
      confidence: w.confidence,
      start_time: w.start,
      end_time: w.end,
      speaker_label: `S${w.speaker}`,
      // Preserve existing review status; new words are PENDING
      status: existingStatus ?? 'PENDING',
      context_before: extractContext(words, w.word_index, -1),
      context_after: extractContext(words, w.word_index, 1),
    });
  }

  // Ensure ascending word_index order
  flagged.sort((a, b) => a.word_index - b.word_index);
  return flagged;
}

// ---------------------------------------------------------------------------
// Shared fixture (built once for all tests)
// ---------------------------------------------------------------------------

let transcript: TranscriptWord[];
let flagged: FlaggedWord[];

beforeAll(() => {
  transcript = generateTranscript(TOTAL_WORDS);
  // Pre-warm extraction with empty reviewed set (used by timing test)
  flagged = extractFlaggedWords(transcript, new Map());
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Flagged-word extraction — performance', () => {

  // ── 1. Generation time ───────────────────────────────────────────────────

  it(`generates ${TOTAL_WORDS.toLocaleString()} words in < 500ms`, () => {
    const t0 = performance.now();
    generateTranscript(TOTAL_WORDS);
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(500);
  });

  // ── 2. Filter time ───────────────────────────────────────────────────────

  it(`filters ${TOTAL_WORDS.toLocaleString()} words for confidence < ${CONFIDENCE_THRESHOLD} in < 500ms`, () => {
    const t0 = performance.now();
    extractFlaggedWords(transcript, new Map());
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(500);
  });

  // ── 3. Correct flagged count ─────────────────────────────────────────────

  it(`extracts the expected number of flagged words (every ${LOW_CONF_INTERVAL}th word)`, () => {
    expect(flagged.length).toBe(EXPECTED_FLAGGED_COUNT);
  });

  // ── 4. Context extraction ────────────────────────────────────────────────

  it('context_before and context_after are populated for sampled flagged words', () => {
    // Sample 5 words spread across the transcript
    const sampleIndices = [0, 1, 100, 500, flagged.length - 1].filter((i) => i < flagged.length);

    for (const si of sampleIndices) {
      const fw = flagged[si];

      // context_before: empty only for the very first word in the transcript
      if (fw.word_index > 0) {
        expect(fw.context_before.length).toBeGreaterThan(0);
      }

      // context_after: empty only for the very last word in the transcript
      if (fw.word_index < TOTAL_WORDS - 1) {
        expect(fw.context_after.length).toBeGreaterThan(0);
      }

      // Context should be space-separated words
      if (fw.context_before) {
        expect(fw.context_before.split(' ').length).toBeLessThanOrEqual(CONTEXT_WINDOW);
      }
      if (fw.context_after) {
        expect(fw.context_after.split(' ').length).toBeLessThanOrEqual(CONTEXT_WINDOW);
      }
    }
  });

  // ── 5. Sort order: ascending word_index ─────────────────────────────────

  it('flagged words are returned in ascending word_index order', () => {
    for (let i = 1; i < flagged.length; i++) {
      expect(flagged[i].word_index).toBeGreaterThan(flagged[i - 1].word_index);
    }
  });

  // ── 6. Re-extraction preserves already-reviewed statuses ────────────────

  it('re-extraction does not overwrite CORRECTED or CONFIRMED words', () => {
    // Mark the first 10 flagged words as reviewed
    const reviewed = new Map<number, 'CORRECTED' | 'CONFIRMED' | 'SKIPPED'>();
    for (let i = 0; i < 10 && i < flagged.length; i++) {
      const status = i % 2 === 0 ? 'CORRECTED' : 'CONFIRMED';
      reviewed.set(flagged[i].word_index, status);
    }

    const reExtracted = extractFlaggedWords(transcript, reviewed);

    // All 10 pre-reviewed words must keep their status
    for (let i = 0; i < 10 && i < reExtracted.length; i++) {
      const expected = reviewed.get(reExtracted[i].word_index);
      if (expected) {
        expect(reExtracted[i].status).toBe(expected);
      }
    }

    // Words beyond index 9 remain PENDING
    for (let i = 10; i < Math.min(20, reExtracted.length); i++) {
      if (!reviewed.has(reExtracted[i].word_index)) {
        expect(reExtracted[i].status).toBe('PENDING');
      }
    }
  });

  // ── 7. All flagged words are below the confidence threshold ─────────────

  it('every extracted word has confidence below threshold', () => {
    for (const fw of flagged) {
      expect(fw.confidence).toBeLessThan(CONFIDENCE_THRESHOLD);
    }
  });
});

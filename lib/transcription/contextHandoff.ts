/**
 * lib/transcription/contextHandoff.ts
 *
 * Context handoff between audio chunks.
 *
 * PROBLEM IT SOLVES:
 *   With fixed chunking, sentences that start at 44:58 and finish at 45:05
 *   span a chunk boundary. Without context, the model processing Chunk B has
 *   no knowledge of the sentence already in progress — causing word errors,
 *   speaker misattribution, and broken formatting at every boundary.
 *
 * APPROACH:
 *   1. After each chunk is transcribed, extract the last N characters of the
 *      final transcript text as a "tail context."
 *   2. Prepend that tail to the AI correction prompt for the NEXT chunk.
 *   3. Also extract the last speaker label so speaker continuity is preserved.
 *
 * This is a pure TypeScript utility — no external dependencies, no DB writes.
 * It is consumed by the TranscriptionEngine orchestrator.
 */

export interface ChunkContext {
  /** Last ~100 chars of previous chunk's transcript text */
  tailText: string;
  /** Speaker label of the last word in the previous chunk */
  lastSpeaker: string;
  /** Timestamp of the last word in the previous chunk (seconds) */
  lastWordEnd: number;
  /** Zero-based index of the chunk this context came FROM */
  sourceChunkIndex: number;
}

export interface WordForContext {
  word: string;
  punctuated_word?: string;
  speaker: string | number;
  end: number;
  confidence: number;
}

/** Number of characters to extract as the tail context */
const TAIL_CHARS = 120;

/**
 * Extracts context from the END of a processed chunk.
 * Call this immediately after a chunk is transcribed, before processing
 * the next chunk.
 */
export function extractChunkTail(
  chunkIndex: number,
  words: WordForContext[],
): ChunkContext | null {
  if (!words || words.length === 0) return null;

  // Build the display text from punctuated words
  const fullText = words
    .map((w) => w.punctuated_word ?? w.word)
    .join(' ')
    .trim();

  const tailText = fullText.length > TAIL_CHARS
    ? '…' + fullText.slice(-TAIL_CHARS)
    : fullText;

  const lastWord = words[words.length - 1];

  return {
    tailText,
    lastSpeaker: String(lastWord.speaker),
    lastWordEnd: lastWord.end,
    sourceChunkIndex: chunkIndex,
  };
}

/**
 * Formats context for injection into the AI correction prompt.
 * Returns a string that should be prepended to the correction prompt.
 */
export function formatContextForPrompt(context: ChunkContext | null): string {
  if (!context) return '';

  return (
    `[PRECEDING TRANSCRIPT CONTEXT from chunk ${context.sourceChunkIndex}]\n` +
    `Last speaker: ${context.lastSpeaker}\n` +
    `Preceding text: "${context.tailText}"\n` +
    `[END CONTEXT — continue transcript from here]\n\n`
  );
}

/**
 * Validates that a context handoff is still relevant for the next chunk.
 * Returns false if the time gap between chunks is too large (broken recording,
 * long pause, etc.) where context would be misleading rather than helpful.
 */
export function isContextStillValid(
  context: ChunkContext,
  nextChunkStartTime: number,
  maxGapSeconds = 30,
): boolean {
  const gap = nextChunkStartTime - context.lastWordEnd;
  return gap >= 0 && gap <= maxGapSeconds;
}

/**
 * Builds a context summary for logging/debugging.
 */
export function describeContext(context: ChunkContext | null): string {
  if (!context) return 'no context';
  return (
    `chunk ${context.sourceChunkIndex} → ` +
    `speaker=${context.lastSpeaker}, ` +
    `ends at ${context.lastWordEnd.toFixed(1)}s, ` +
    `tail="${context.tailText.slice(0, 40)}…"`
  );
}

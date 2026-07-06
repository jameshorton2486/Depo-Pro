import type { MergedSourceSegment } from "./multifileMerge";
import type { NormalizedTranscriptData } from "./normalize";

const DEFAULT_AUTO_CHUNK_THRESHOLD_SECONDS = 4500;
const DUPLICATE_SPAN_MIN_TOKENS = 8;
const DUPLICATE_SPAN_SIMILARITY_THRESHOLD = 0.7;

export interface CanonicalIntegrityResult {
  integrity_passed: boolean;
  failures: string[];
  warnings: string[];
  metrics: Record<string, unknown>;
}

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function tokenizeComparableText(text: string): string[] {
  return text
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);
}

function computeTokenOverlap(left: string[], right: string[]): number {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  const denominator = Math.max(leftSet.size, rightSet.size, 1);
  return intersection / denominator;
}

export function auditCanonicalTranscript(input: {
  normalized: NormalizedTranscriptData;
  segments?: MergedSourceSegment[];
  autoChunkThresholdSeconds?: number;
}): CanonicalIntegrityResult {
  const { normalized, segments = [], autoChunkThresholdSeconds = DEFAULT_AUTO_CHUNK_THRESHOLD_SECONDS } = input;
  const failures: string[] = [];
  const warnings: string[] = [];
  const wordsByUtterance = new Map<string, typeof normalized.words>();
  const utteranceIds = new Set(normalized.utterances.map((utterance) => utterance.utterance_id));
  const seenWordIds = new Set<string>();

  for (const word of normalized.words) {
    if (seenWordIds.has(word.word_id)) {
      failures.push(`Duplicate canonical word_id '${word.word_id}'.`);
    } else {
      seenWordIds.add(word.word_id);
    }

    if (!utteranceIds.has(word.utterance_id)) {
      failures.push(`Word ${word.word_id} references missing utterance ${word.utterance_id}.`);
    }

    const bucket = wordsByUtterance.get(word.utterance_id) ?? [];
    bucket.push(word);
    wordsByUtterance.set(word.utterance_id, bucket);
  }

  let previousWord: typeof normalized.words[number] | null = null;
  normalized.words.forEach((word, index) => {
    if (word.word_index !== index) {
      failures.push(`Word ${word.word_id} has non-contiguous word_index ${word.word_index}; expected ${index}.`);
    }
    if (word.end_time < word.start_time) {
      failures.push(`Word ${word.word_id} ends before it starts.`);
    }
    if (previousWord) {
      if (word.start_time < previousWord.start_time) {
        failures.push(`Word timing order regressed between ${previousWord.word_id} and ${word.word_id}.`);
      }
      if (word.end_time < previousWord.end_time && word.start_time < previousWord.end_time) {
        warnings.push(`Overlapping canonical word timings between ${previousWord.word_id} and ${word.word_id}.`);
      }
    }
    previousWord = word;
  });

  normalized.utterances.forEach((utterance, index) => {
    if (utterance.utterance_index !== index) {
      failures.push(
        `Utterance ${utterance.utterance_id} has non-contiguous utterance_index ${utterance.utterance_index}; expected ${index}.`,
      );
    }

    const utteranceWords = wordsByUtterance.get(utterance.utterance_id) ?? [];
    if (utteranceWords.length === 0) {
      failures.push(`Utterance ${utterance.utterance_id} has no canonical words.`);
      return;
    }

    const joinedWords = utteranceWords.map((word) => word.raw_text).join(" ");
    if (utterance.text !== joinedWords) {
      failures.push(
        `Utterance ${utterance.utterance_id} text does not equal joined canonical words.`,
      );
    }
  });

  for (let index = 1; index < normalized.utterances.length; index += 1) {
    const previous = normalized.utterances[index - 1];
    const current = normalized.utterances[index];
    const previousTokens = tokenizeComparableText(previous.text);
    const currentTokens = tokenizeComparableText(current.text);

    if (
      previousTokens.length >= DUPLICATE_SPAN_MIN_TOKENS
      && currentTokens.length >= DUPLICATE_SPAN_MIN_TOKENS
      && computeTokenOverlap(previousTokens, currentTokens) >= DUPLICATE_SPAN_SIMILARITY_THRESHOLD
    ) {
      failures.push(
        `Suspicious duplicate canonical span between ${previous.utterance_id} and ${current.utterance_id}.`,
      );
    }
  }

  const totalDurationSeconds = segments.reduce((max, segment) => Math.max(max, segment.start_offset_seconds + segment.duration_seconds), 0);
  if (segments.length === 1 && totalDurationSeconds > autoChunkThresholdSeconds) {
    warnings.push(
      `Single-source finalize exceeded auto-chunk threshold (${totalDurationSeconds.toFixed(1)}s > ${autoChunkThresholdSeconds}s).`,
    );
  }

  return {
    integrity_passed: failures.length === 0,
    failures,
    warnings,
    metrics: {
      utterance_count: normalized.utterances.length,
      word_count: normalized.words.length,
      segment_count: segments.length,
      total_duration_seconds: totalDurationSeconds,
      exceeded_auto_chunk_threshold: segments.length === 1 && totalDurationSeconds > autoChunkThresholdSeconds,
    },
  };
}

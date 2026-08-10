import { AUTO_CHUNKING_ENABLED, AUTO_CHUNK_THRESHOLD_SECONDS } from "./autoChunking.ts";
import type { MergedSourceSegment } from "./multifileMerge.ts";
import type { NormalizedTranscriptData } from "./normalize.ts";

const DUPLICATE_SPAN_MIN_TOKENS = 8;
const DUPLICATE_SPAN_SIMILARITY_THRESHOLD = 0.7;
const TIMING_TOLERANCE_SECONDS = 0.05;

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
  autoChunkingEnabled?: boolean;
  segments?: MergedSourceSegment[];
  autoChunkThresholdSeconds?: number;
}): CanonicalIntegrityResult {
  const {
    normalized,
    segments = [],
    autoChunkingEnabled = AUTO_CHUNKING_ENABLED,
    autoChunkThresholdSeconds = AUTO_CHUNK_THRESHOLD_SECONDS,
  } = input;
  const failures: string[] = [];
  const warnings: string[] = [];
  const wordsByUtterance = new Map<string, typeof normalized.words>();
  const utteranceIds = new Set(normalized.utterances.map((utterance) => utterance.utterance_id));
  const speakerIds = new Set(normalized.speakers.map((speaker) => speaker.speaker_id));
  const seenWordIds = new Set<string>();
  const seenUtteranceIds = new Set<string>();
  const seenSpeakerIds = new Set<string>();

  if (!Number.isFinite(normalized.durationSeconds) || normalized.durationSeconds < 0) {
    failures.push("Canonical transcript has an invalid duration.");
  }

  // A transcript with no recognized words is never a valid deposition. Without
  // this gate a zero-word result (silent / music-only / failed-decode audio, or
  // a finalize re-driven by the watchdog on empty stored responses) skips every
  // loop below, passes with zero failures, and is ingested as `completed` — a
  // blank Workspace with no error. Route it to manual review instead.
  if (normalized.words.length === 0 || normalized.utterances.length === 0) {
    failures.push("Canonical transcript contains no recognized words.");
  }

  for (const speaker of normalized.speakers) {
    if (seenSpeakerIds.has(speaker.speaker_id)) {
      failures.push(`Duplicate canonical speaker_id '${speaker.speaker_id}'.`);
    } else {
      seenSpeakerIds.add(speaker.speaker_id);
    }
  }

  for (const word of normalized.words) {
    if (!Number.isFinite(word.start_time) || !Number.isFinite(word.end_time) || word.start_time < 0 || word.end_time < 0) {
      failures.push(`Word ${word.word_id} has invalid timing.`);
    }

    if (seenWordIds.has(word.word_id)) {
      failures.push(`Duplicate canonical word_id '${word.word_id}'.`);
    } else {
      seenWordIds.add(word.word_id);
    }

    if (!utteranceIds.has(word.utterance_id)) {
      failures.push(`Word ${word.word_id} references missing utterance ${word.utterance_id}.`);
    }
    if (!speakerIds.has(word.speaker_id)) {
      failures.push(`Word ${word.word_id} references missing speaker ${word.speaker_id}.`);
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
      if (word.start_time < previousWord.end_time) {
        warnings.push(`Overlapping canonical word timings between ${previousWord.word_id} and ${word.word_id}.`);
      }
    }
    previousWord = word;
  });

  normalized.utterances.forEach((utterance, index) => {
    if (seenUtteranceIds.has(utterance.utterance_id)) {
      failures.push(`Duplicate canonical utterance_id '${utterance.utterance_id}'.`);
    } else {
      seenUtteranceIds.add(utterance.utterance_id);
    }

    if (!Number.isFinite(utterance.start_time) || !Number.isFinite(utterance.end_time) || utterance.start_time < 0 || utterance.end_time < 0) {
      failures.push(`Utterance ${utterance.utterance_id} has invalid timing.`);
    } else if (utterance.end_time < utterance.start_time) {
      failures.push(`Utterance ${utterance.utterance_id} ends before it starts.`);
    }

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
    if (!speakerIds.has(utterance.speaker_id)) {
      failures.push(`Utterance ${utterance.utterance_id} references missing speaker ${utterance.speaker_id}.`);
    }

    const joinedWords = utteranceWords.map((word) => word.raw_text).join(" ");
    if (utterance.text !== joinedWords) {
      failures.push(
        `Utterance ${utterance.utterance_id} text does not equal joined canonical words.`,
      );
    }
    if (utteranceWords.some((word) => word.speaker_id !== utterance.speaker_id)) {
      warnings.push(`Utterance ${utterance.utterance_id} contains provider word-level speaker changes.`);
    }

    const earliestWordStart = utteranceWords.reduce(
      (minimum, word) => Math.min(minimum, word.start_time),
      Number.POSITIVE_INFINITY,
    );
    const latestWordEnd = utteranceWords.reduce(
      (maximum, word) => Math.max(maximum, word.end_time),
      Number.NEGATIVE_INFINITY,
    );
    if (
      Number.isFinite(earliestWordStart)
      && Number.isFinite(latestWordEnd)
      && (earliestWordStart < utterance.start_time - TIMING_TOLERANCE_SECONDS
        || latestWordEnd > utterance.end_time + TIMING_TOLERANCE_SECONDS)
    ) {
      warnings.push(`Utterance ${utterance.utterance_id} timing does not bound its canonical words.`);
    }

    const sortedIndices = utteranceWords
      .map((word) => word.word_index)
      .sort((left, right) => left - right);
    for (let wordIndex = 1; wordIndex < sortedIndices.length; wordIndex += 1) {
      if (sortedIndices[wordIndex] !== sortedIndices[wordIndex - 1] + 1) {
        warnings.push(`Utterance ${utterance.utterance_id} has non-contiguous canonical word span.`);
        break;
      }
    }
  });

  for (let index = 1; index < normalized.utterances.length; index += 1) {
    const previous = normalized.utterances[index - 1];
    const current = normalized.utterances[index];
    const previousTokens = tokenizeComparableText(previous.text);
    const currentTokens = tokenizeComparableText(current.text);

    const hasDuplicateText = previousTokens.length >= DUPLICATE_SPAN_MIN_TOKENS
      && currentTokens.length >= DUPLICATE_SPAN_MIN_TOKENS
      && computeTokenOverlap(previousTokens, currentTokens) >= DUPLICATE_SPAN_SIMILARITY_THRESHOLD;
    const hasDuplicateTiming = current.start_time <= previous.end_time + TIMING_TOLERANCE_SECONDS;

    if (hasDuplicateText && hasDuplicateTiming) {
      failures.push(
        `Suspicious duplicate canonical span between ${previous.utterance_id} and ${current.utterance_id}.`,
      );
    } else if (hasDuplicateText) {
      warnings.push(
        `Similar adjacent canonical span between ${previous.utterance_id} and ${current.utterance_id}.`,
      );
    }
  }

  const totalDurationSeconds = segments.reduce((max, segment) => Math.max(max, segment.start_offset_seconds + segment.duration_seconds), 0);
  const exceededAutoChunkThreshold = autoChunkingEnabled
    && segments.length === 1
    && totalDurationSeconds > autoChunkThresholdSeconds;
  if (exceededAutoChunkThreshold) {
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
      exceeded_auto_chunk_threshold: exceededAutoChunkThreshold,
    },
  };
}

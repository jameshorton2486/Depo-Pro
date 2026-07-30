import type { DeepgramResponse } from "./types.ts";
import type {
  CanonicalSpeakerRow,
  CanonicalUtteranceRow,
  CanonicalWordRow,
  NormalizedTranscriptData,
} from "./normalize.ts";

export interface SourceTranscriptSegment {
  source_audio_id: string;
  source_index: number;
  source_filename: string;
  mime_type: string;
  storage_path: string | null;
  media_url: string | null;
  response: DeepgramResponse;
  normalized: NormalizedTranscriptData;
  fallback_duration_seconds: number | null;
  virtual_chunk?: {
    chunk_index: number;
    start_seconds: number;
    end_seconds: number;
    nominal_offset_seconds: number;
    overlap_with_next_seconds: number;
  };
}

export interface MergedSourceSegment {
  source_audio_id: string;
  source_index: number;
  source_filename: string;
  mime_type: string;
  storage_path: string | null;
  media_url: string | null;
  start_offset_seconds: number;
  duration_seconds: number;
}

export interface MergedTranscriptResult {
  normalized: NormalizedTranscriptData;
  segments: MergedSourceSegment[];
}

function utteranceIdForIndex(index: number): string {
  return `utt_${String(index).padStart(6, "0")}`;
}

function wordIdForIndex(index: number): string {
  return `w_${String(index).padStart(8, "0")}`;
}

function namespacedSpeakerId(sourceIndex: number, speakerIndex: number): string {
  return `spk_f${String(sourceIndex).padStart(3, "0")}_s${String(speakerIndex).padStart(3, "0")}`;
}

function namespacedSpeakerLabel(sourceIndex: number, speakerIndex: number): string {
  return `File ${sourceIndex + 1} Speaker ${speakerIndex}`;
}

function stableChunkSpeakerId(sourceAudioId: string, speakerIndex: number): string {
  const sanitizedAudioId = sourceAudioId.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  return `spk_${sanitizedAudioId}_s${String(speakerIndex).padStart(3, "0")}`;
}

function stableChunkSpeakerLabel(speakerIndex: number): string {
  return `Speaker ${speakerIndex}`;
}

function roundConfidence(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(4));
}

function getSegmentDurationSeconds(segment: SourceTranscriptSegment): number {
  const lastWordEnd = segment.normalized.words.length > 0
    ? segment.normalized.words[segment.normalized.words.length - 1].end_time
    : null;
  const candidates = [
    segment.normalized.durationSeconds,
    segment.response.metadata.duration,
    lastWordEnd,
    segment.fallback_duration_seconds,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate >= 0) {
      return candidate;
    }
  }

  throw new Error(`Source file ${segment.source_filename} is missing duration metadata required for rebasing.`);
}

function mergeSingleTranscript(segment: SourceTranscriptSegment): MergedTranscriptResult {
  return {
    normalized: segment.normalized,
    segments: [{
      source_audio_id: segment.source_audio_id,
      source_index: segment.source_index,
      source_filename: segment.source_filename,
      mime_type: segment.mime_type,
      storage_path: segment.storage_path,
      media_url: segment.media_url,
      start_offset_seconds: 0,
      duration_seconds: getSegmentDurationSeconds(segment),
    }],
  };
}

function isVirtualChunkMerge(segments: SourceTranscriptSegment[]): boolean {
  return segments.length > 1 && segments.every((segment) => segment.virtual_chunk);
}

function mergeVirtualChunkTranscriptSegments(segments: SourceTranscriptSegment[]): MergedTranscriptResult {
  const mergedSegments: MergedSourceSegment[] = [];
  const mergedSpeakers = new Map<string, CanonicalSpeakerRow>();
  const speakerSourceKeys = new Map<string, string>();
  const candidateWords: Array<CanonicalWordRow & {
    sourceIndex: number;
    sourceUtteranceKey: string;
    sourceUtteranceOrder: number;
    speakerLabel: string;
  }> = [];
  let utteranceOrder = 0;

  for (const segment of segments) {
    if (!segment.virtual_chunk) {
      throw new Error("Virtual chunk merge requires chunk metadata on every segment.");
    }

    const rebasedOffsetSeconds = segment.virtual_chunk.nominal_offset_seconds - segment.virtual_chunk.start_seconds;
    const durationSeconds = segment.virtual_chunk.end_seconds - segment.virtual_chunk.start_seconds;
    mergedSegments.push({
      source_audio_id: segment.source_audio_id,
      source_index: segment.source_index,
      source_filename: segment.source_filename,
      mime_type: segment.mime_type,
      storage_path: segment.storage_path,
      media_url: segment.media_url,
      start_offset_seconds: segment.virtual_chunk.nominal_offset_seconds,
      duration_seconds: durationSeconds,
    });

    for (const speaker of segment.normalized.speakers) {
      const speakerId = stableChunkSpeakerId(segment.source_audio_id, speaker.speaker_index);
      if (!mergedSpeakers.has(speakerId)) {
        mergedSpeakers.set(speakerId, {
          speaker_id: speakerId,
          speaker_index: speaker.speaker_index,
          speaker_label: stableChunkSpeakerLabel(speaker.speaker_index),
          assigned_name: null,
          speaker_role: null,
          word_count: 0,
        });
      }
      speakerSourceKeys.set(`${segment.source_index}:${speaker.speaker_id}`, speakerId);
    }

    for (const utterance of segment.normalized.utterances) {
      utteranceOrder += 1;
      for (const word of segment.normalized.words.filter((candidate) => candidate.utterance_id === utterance.utterance_id)) {
        const speakerId = speakerSourceKeys.get(`${segment.source_index}:${word.speaker_id}`)
          ?? stableChunkSpeakerId(segment.source_audio_id, word.speaker_index);
        candidateWords.push({
          ...word,
          word_id: "",
          utterance_id: utterance.utterance_id,
          speaker_id: speakerId,
          start_time: word.start_time + rebasedOffsetSeconds,
          end_time: word.end_time + rebasedOffsetSeconds,
          sourceIndex: segment.source_index,
          sourceUtteranceKey: `${segment.source_index}:${utterance.utterance_id}`,
          sourceUtteranceOrder: utteranceOrder,
          speakerLabel: stableChunkSpeakerLabel(word.speaker_index),
        });
      }
    }
  }

  const dedupedWords: typeof candidateWords = [];
  const matchToleranceSeconds = 0.35;

  for (const candidate of candidateWords.sort((left, right) => {
    if (left.start_time !== right.start_time) {
      return left.start_time - right.start_time;
    }
    if (left.end_time !== right.end_time) {
      return left.end_time - right.end_time;
    }
    return left.sourceUtteranceOrder - right.sourceUtteranceOrder;
  })) {
    // Do NOT include speaker_index in the dedup key. Deepgram assigns
    // speaker indices independently per chunk, so the same conversational
    // speaker often gets different indices in adjacent chunks of the same
    // physical audio. Matching on text+timing alone catches the overlap
    // duplicates the virtual-chunk merge is designed to remove.
    const duplicateIndex = dedupedWords.findIndex((existing) =>
      // Only collapse duplicates that straddle the chunk-overlap seam (different
      // source chunks). Deepgram never emits the same word twice within one
      // chunk, so an intra-chunk text+timing match is a genuine repeat ("that
      // that", a stutter) — deduping those silently deletes dictated words.
      existing.sourceIndex !== candidate.sourceIndex
      && existing.raw_text.toLowerCase() === candidate.raw_text.toLowerCase()
      && Math.abs(existing.start_time - candidate.start_time) <= matchToleranceSeconds
      && Math.abs(existing.end_time - candidate.end_time) <= matchToleranceSeconds
    );

    if (duplicateIndex >= 0) {
      if (candidate.confidence > dedupedWords[duplicateIndex].confidence) {
        dedupedWords[duplicateIndex] = candidate;
      }
      continue;
    }

    dedupedWords.push(candidate);
  }

  dedupedWords.sort((left, right) => {
    if (left.start_time !== right.start_time) {
      return left.start_time - right.start_time;
    }
    if (left.end_time !== right.end_time) {
      return left.end_time - right.end_time;
    }
    return left.sourceUtteranceOrder - right.sourceUtteranceOrder;
  });

  const mergedWords: CanonicalWordRow[] = dedupedWords.map((word, index) => ({
    word_id: wordIdForIndex(index),
    utterance_id: "",
    word_index: index,
    raw_text: word.raw_text,
    working_text: word.working_text,
    speaker_id: word.speaker_id,
    speaker_index: word.speaker_index,
    start_time: word.start_time,
    end_time: word.end_time,
    confidence: word.confidence,
    is_filler: word.is_filler,
    reviewed: word.reviewed,
    edited: word.edited,
  }));

  const utteranceBuckets = new Map<string, { order: number; words: Array<typeof dedupedWords[number]> }>();
  for (const word of dedupedWords) {
    const bucket = utteranceBuckets.get(word.sourceUtteranceKey) ?? { order: word.sourceUtteranceOrder, words: [] };
    bucket.words.push(word);
    utteranceBuckets.set(word.sourceUtteranceKey, bucket);
  }

  const mergedUtterances: CanonicalUtteranceRow[] = [];
  // Map by object identity, not by (start_time, end_time, raw_text, speaker_id) —
  // identical-timestamp filler words with matching text can otherwise collide and
  // leave one mergedWord without an utterance_id assignment.
  const mergedIndexByWord = new Map<typeof dedupedWords[number], number>();
  for (const [index, word] of dedupedWords.entries()) {
    mergedIndexByWord.set(word, index);
  }

  const utteranceEntries = [...utteranceBuckets.entries()]
    .sort((left, right) => left[1].order - right[1].order)
    .map(([, bucket]) => bucket.words.sort((left, right) => left.start_time - right.start_time))
    .filter((words) => words.length > 0);

  utteranceEntries.forEach((words, utteranceIndex) => {
    const utteranceId = utteranceIdForIndex(utteranceIndex);
    const firstWord = words[0];
    const lastWord = words[words.length - 1];
    mergedUtterances.push({
      utterance_id: utteranceId,
      utterance_index: utteranceIndex,
      speaker_id: firstWord.speaker_id,
      speaker_index: firstWord.speaker_index,
      speaker_label: firstWord.speakerLabel,
      start_time: firstWord.start_time,
      end_time: lastWord.end_time,
      text: words.map((word) => word.raw_text).join(" "),
      avg_confidence: roundConfidence(words.reduce((sum, word) => sum + word.confidence, 0) / words.length) ?? 0,
    });

    for (const word of words) {
      const mergedWordIndex = mergedIndexByWord.get(word);
      if (mergedWordIndex != null) {
        mergedWords[mergedWordIndex].utterance_id = utteranceId;
      }
    }
  });

  for (const speaker of mergedSpeakers.values()) {
    speaker.word_count = mergedWords.filter((word) => word.speaker_id === speaker.speaker_id).length;
  }

  const durationSeconds = mergedWords.length > 0
    ? mergedWords[mergedWords.length - 1].end_time
    : segments[segments.length - 1]?.virtual_chunk?.end_seconds ?? 0;
  const avgConfidence = mergedWords.length > 0
    ? roundConfidence(mergedWords.reduce((sum, word) => sum + word.confidence, 0) / mergedWords.length)
    : null;

  return {
    normalized: {
      durationSeconds,
      avgConfidence,
      speakers: [...mergedSpeakers.values()].sort((left, right) => left.speaker_index - right.speaker_index),
      utterances: mergedUtterances,
      words: mergedWords,
    },
    segments: mergedSegments,
  };
}

export function mergeSourceTranscriptSegments(segments: SourceTranscriptSegment[]): MergedTranscriptResult {
  if (segments.length === 0) {
    return {
      normalized: {
        durationSeconds: 0,
        avgConfidence: null,
        speakers: [],
        utterances: [],
        words: [],
      },
      segments: [],
    };
  }

  if (segments.length === 1) {
    return mergeSingleTranscript(segments[0]);
  }

  if (isVirtualChunkMerge(segments)) {
    return mergeVirtualChunkTranscriptSegments(segments);
  }

  const mergedSpeakers: CanonicalSpeakerRow[] = [];
  const mergedUtterances: CanonicalUtteranceRow[] = [];
  const mergedWords: CanonicalWordRow[] = [];
  const mergedSegments: MergedSourceSegment[] = [];
  let timeOffsetSeconds = 0;
  let globalUtteranceIndex = 0;
  let globalWordIndex = 0;

  for (const segment of segments) {
    const speakerMap = new Map<string, CanonicalSpeakerRow>();
    const utteranceMap = new Map<string, string>();
    const durationSeconds = getSegmentDurationSeconds(segment);

    mergedSegments.push({
      source_audio_id: segment.source_audio_id,
      source_index: segment.source_index,
      source_filename: segment.source_filename,
      mime_type: segment.mime_type,
      storage_path: segment.storage_path,
      media_url: segment.media_url,
      start_offset_seconds: timeOffsetSeconds,
      duration_seconds: durationSeconds,
    });

    for (const speaker of segment.normalized.speakers) {
      const nextSpeaker: CanonicalSpeakerRow = {
        speaker_id: namespacedSpeakerId(segment.source_index, speaker.speaker_index),
        speaker_index: speaker.speaker_index,
        speaker_label: namespacedSpeakerLabel(segment.source_index, speaker.speaker_index),
        assigned_name: null,
        speaker_role: null,
        word_count: speaker.word_count,
      };
      speakerMap.set(speaker.speaker_id, nextSpeaker);
      mergedSpeakers.push(nextSpeaker);
    }

    for (const utterance of segment.normalized.utterances) {
      const speaker = speakerMap.get(utterance.speaker_id) ?? {
        speaker_id: namespacedSpeakerId(segment.source_index, utterance.speaker_index),
        speaker_index: utterance.speaker_index,
        speaker_label: namespacedSpeakerLabel(segment.source_index, utterance.speaker_index),
        assigned_name: null,
        speaker_role: null,
        word_count: 0,
      };
      const utteranceId = utteranceIdForIndex(globalUtteranceIndex);
      utteranceMap.set(utterance.utterance_id, utteranceId);
      mergedUtterances.push({
        utterance_id: utteranceId,
        utterance_index: globalUtteranceIndex,
        speaker_id: speaker.speaker_id,
        speaker_index: speaker.speaker_index,
        speaker_label: speaker.speaker_label,
        start_time: utterance.start_time + timeOffsetSeconds,
        end_time: utterance.end_time + timeOffsetSeconds,
        text: utterance.text,
        avg_confidence: utterance.avg_confidence,
      });
      globalUtteranceIndex += 1;
    }

    for (const word of segment.normalized.words) {
      const speaker = speakerMap.get(word.speaker_id) ?? {
        speaker_id: namespacedSpeakerId(segment.source_index, word.speaker_index),
        speaker_index: word.speaker_index,
        speaker_label: namespacedSpeakerLabel(segment.source_index, word.speaker_index),
        assigned_name: null,
        speaker_role: null,
        word_count: 0,
      };
      mergedWords.push({
        word_id: wordIdForIndex(globalWordIndex),
        utterance_id: utteranceMap.get(word.utterance_id) ?? utteranceIdForIndex(globalUtteranceIndex),
        word_index: globalWordIndex,
        raw_text: word.raw_text,
        working_text: word.working_text,
        speaker_id: speaker.speaker_id,
        speaker_index: speaker.speaker_index,
        start_time: word.start_time + timeOffsetSeconds,
        end_time: word.end_time + timeOffsetSeconds,
        confidence: word.confidence,
        is_filler: word.is_filler,
        reviewed: word.reviewed,
        edited: word.edited,
      });
      globalWordIndex += 1;
    }

    timeOffsetSeconds += durationSeconds;
  }

  const avgConfidence = mergedWords.length > 0
    ? roundConfidence(mergedWords.reduce((sum, word) => sum + word.confidence, 0) / mergedWords.length)
    : null;

  return {
    normalized: {
      durationSeconds: timeOffsetSeconds,
      avgConfidence,
      speakers: mergedSpeakers,
      utterances: mergedUtterances,
      words: mergedWords,
    },
    segments: mergedSegments,
  };
}

export function getPrimaryMediaUrl(segments: MergedSourceSegment[]): string | null {
  return segments[0]?.storage_path ?? null;
}

export function getPrimarySourceAudioId(segments: MergedSourceSegment[]): string | null {
  return segments[0]?.source_audio_id ?? null;
}

export function getPrimarySourceFilename(segments: MergedSourceSegment[]): string | null {
  return segments[0]?.source_filename ?? null;
}

export function getPrimaryMimeType(segments: MergedSourceSegment[]): string {
  return segments[0]?.mime_type ?? "";
}

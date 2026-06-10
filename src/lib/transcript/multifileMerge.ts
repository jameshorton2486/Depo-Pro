import type { DeepgramResponse } from "./types";
import type {
  CanonicalSpeakerRow,
  CanonicalUtteranceRow,
  CanonicalWordRow,
  NormalizedTranscriptData,
} from "./normalize";

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

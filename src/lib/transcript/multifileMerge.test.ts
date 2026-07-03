import { describe, expect, it } from "vitest";

import { normalizeTranscriptResponse } from "./normalize";
import { createOfflineDeepgramFixture } from "./offlineFixture";
import { mergeSourceTranscriptSegments } from "./multifileMerge";

function buildSegment(caseId: string, sourceIndex: number, overrides?: {
  metadataDuration?: number;
  fallbackDurationSeconds?: number | null;
  sourceAudioId?: string;
  virtualChunk?: {
    chunkIndex: number;
    startSeconds: number;
    endSeconds: number;
    nominalOffsetSeconds: number;
    overlapWithNextSeconds: number;
  };
}) {
  const response = createOfflineDeepgramFixture(caseId);
  if (typeof overrides?.metadataDuration === "number") {
    response.metadata.duration = overrides.metadataDuration;
  }

  return {
    source_audio_id: overrides?.sourceAudioId ?? `audio_${sourceIndex}`,
    source_index: sourceIndex,
    source_filename: `source_${sourceIndex + 1}.mp3`,
    mime_type: "audio/mpeg",
    storage_path: `cases/demo/audio_${sourceIndex}.mp3`,
    media_url: null,
    response,
    normalized: normalizeTranscriptResponse(response),
    fallback_duration_seconds: overrides?.fallbackDurationSeconds ?? response.metadata.duration,
    virtual_chunk: overrides?.virtualChunk
      ? {
          chunk_index: overrides.virtualChunk.chunkIndex,
          start_seconds: overrides.virtualChunk.startSeconds,
          end_seconds: overrides.virtualChunk.endSeconds,
          nominal_offset_seconds: overrides.virtualChunk.nominalOffsetSeconds,
          overlap_with_next_seconds: overrides.virtualChunk.overlapWithNextSeconds,
        }
      : undefined,
  };
}

describe("mergeSourceTranscriptSegments", () => {
  it("preserves single-file normalized output exactly", () => {
    const segment = buildSegment("case_single", 0);

    const merged = mergeSourceTranscriptSegments([segment]);

    expect(merged.normalized).toEqual(segment.normalized);
    expect(merged.segments).toEqual([{
      source_audio_id: "audio_0",
      source_index: 0,
      source_filename: "source_1.mp3",
      mime_type: "audio/mpeg",
      storage_path: "cases/demo/audio_0.mp3",
      media_url: null,
      start_offset_seconds: 0,
      duration_seconds: segment.response.metadata.duration,
    }]);
  });

  it("rebases timings, maintains ordinal continuity, and namespaces speakers across files", () => {
    const first = buildSegment("case_a", 0, { metadataDuration: 6 });
    const second = buildSegment("case_b", 1, { metadataDuration: 7 });

    const merged = mergeSourceTranscriptSegments([first, second]);
    const firstWordCount = first.normalized.words.length;
    const firstUtteranceCount = first.normalized.utterances.length;

    expect(merged.normalized.words).toHaveLength(first.normalized.words.length + second.normalized.words.length);
    expect(merged.normalized.utterances).toHaveLength(first.normalized.utterances.length + second.normalized.utterances.length);
    expect(merged.normalized.speakers.map((speaker) => speaker.speaker_id)).toEqual([
      "spk_f000_s000",
      "spk_f000_s001",
      "spk_f001_s000",
      "spk_f001_s001",
    ]);
    expect(merged.normalized.words[firstWordCount].word_id).toBe(`w_${String(firstWordCount).padStart(8, "0")}`);
    expect(merged.normalized.utterances[firstUtteranceCount].utterance_id).toBe(`utt_${String(firstUtteranceCount).padStart(6, "0")}`);
    expect(merged.normalized.words[firstWordCount].start_time).toBeCloseTo(
      second.normalized.words[0].start_time + 6,
      5,
    );
    expect(merged.normalized.utterances[firstUtteranceCount].speaker_label).toBe("File 2 Speaker 0");
  });

  it("falls back to the previous file's last word end time when duration metadata is missing", () => {
    const first = buildSegment("case_duration", 0, { metadataDuration: 6 });
    const second = buildSegment("case_duration_2", 1, {
      metadataDuration: Number.NaN,
      fallbackDurationSeconds: null,
    });
    second.normalized.durationSeconds = Number.NaN;
    second.response.metadata.duration = Number.NaN;

    const merged = mergeSourceTranscriptSegments([first, second]);
    const secondSegment = merged.segments[1];
    const expectedDuration = second.normalized.words[second.normalized.words.length - 1].end_time;

    expect(secondSegment.duration_seconds).toBeCloseTo(expectedDuration, 5);
    expect(merged.normalized.durationSeconds).toBeCloseTo(6 + expectedDuration, 5);
  });

  it("deduplicates overlapping virtual chunk content and keeps stable speakers for one source file", () => {
    const first = buildSegment("case_chunk_shared", 0, {
      sourceAudioId: "audio_shared",
      virtualChunk: {
        chunkIndex: 0,
        startSeconds: 0,
        endSeconds: 12.4,
        nominalOffsetSeconds: 0,
        overlapWithNextSeconds: 2,
      },
    });
    const second = buildSegment("case_chunk_shared", 1, {
      sourceAudioId: "audio_shared",
      virtualChunk: {
        chunkIndex: 1,
        startSeconds: 2,
        endSeconds: 14.4,
        nominalOffsetSeconds: 2,
        overlapWithNextSeconds: 0,
      },
    });

    first.normalized.words.forEach((word) => {
      word.confidence = 0.7;
    });
    second.normalized.words.forEach((word) => {
      word.confidence = 0.95;
    });
    second.response.results.utterances?.forEach((utterance) => {
      utterance.words.forEach((word) => {
        word.confidence = 0.95;
      });
    });
    second.response.metadata.duration = 12.4;
    second.normalized.durationSeconds = 12.4;

    const merged = mergeSourceTranscriptSegments([first, second]);

    expect(merged.normalized.words).toHaveLength(first.normalized.words.length);
    expect(new Set(merged.normalized.speakers.map((speaker) => speaker.speaker_id))).toEqual(new Set([
      "spk_audio_shared_s000",
      "spk_audio_shared_s001",
    ]));
    expect(merged.segments.map((segment) => segment.start_offset_seconds)).toEqual([0, 2]);
    expect(merged.normalized.words.every((word) => word.confidence === 0.95)).toBe(true);
  });

  it("assigns an utterance_id to every merged word (no orphaned words from identity collisions)", () => {
    const first = buildSegment("case_orphan_check", 0, {
      sourceAudioId: "audio_shared",
      virtualChunk: {
        chunkIndex: 0,
        startSeconds: 0,
        endSeconds: 12.4,
        nominalOffsetSeconds: 0,
        overlapWithNextSeconds: 2,
      },
    });
    const second = buildSegment("case_orphan_check", 1, {
      sourceAudioId: "audio_shared",
      virtualChunk: {
        chunkIndex: 1,
        startSeconds: 2,
        endSeconds: 14.4,
        nominalOffsetSeconds: 2,
        overlapWithNextSeconds: 0,
      },
    });

    const merged = mergeSourceTranscriptSegments([first, second]);

    expect(merged.normalized.words.length).toBeGreaterThan(0);
    for (const word of merged.normalized.words) {
      expect(word.utterance_id).not.toBe("");
    }
    const utteranceIds = new Set(merged.normalized.utterances.map((utt) => utt.utterance_id));
    for (const word of merged.normalized.words) {
      expect(utteranceIds.has(word.utterance_id)).toBe(true);
    }
  });
});

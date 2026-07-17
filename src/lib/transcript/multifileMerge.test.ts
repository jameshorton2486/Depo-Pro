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

  it("stitches the same speaker across chunks even when Deepgram swaps the indices", () => {
    // Both chunks are slices of one physical recording. Deepgram diarizes each
    // independently, so speaker A is index 0 in chunk 0 but index 1 in chunk 1
    // (and B is the mirror). Both speakers talk in the shared 8-10s overlap, so
    // the merge should collapse them to exactly two canonical speakers.
    const response = createOfflineDeepgramFixture("case_reid");
    const audioId = "audio_physical";

    const makeWord = (
      wordIndex: number,
      text: string,
      start: number,
      end: number,
      speakerIndex: number,
    ) => ({
      word_id: `w_${String(wordIndex).padStart(8, "0")}`,
      utterance_id: `utt_${String(speakerIndex).padStart(6, "0")}_${Math.floor(start)}`,
      word_index: wordIndex,
      raw_text: text,
      working_text: null,
      speaker_id: `spk_${String(speakerIndex).padStart(3, "0")}`,
      speaker_index: speakerIndex,
      start_time: start,
      end_time: end,
      confidence: 0.9,
      is_filler: false,
      reviewed: false,
      edited: false,
    });

    const buildChunkSegment = (
      sourceIndex: number,
      startSeconds: number,
      endSeconds: number,
      words: ReturnType<typeof makeWord>[],
    ) => {
      const speakerIndexes = [...new Set(words.map((word) => word.speaker_index))].sort((a, b) => a - b);
      const utteranceIds = [...new Set(words.map((word) => word.utterance_id))];
      return {
        source_audio_id: audioId,
        source_index: sourceIndex,
        source_filename: `chunk_${sourceIndex}.mp3`,
        mime_type: "audio/mpeg",
        storage_path: `cases/reid/${audioId}.mp3`,
        media_url: null,
        response,
        normalized: {
          durationSeconds: endSeconds - startSeconds,
          avgConfidence: 0.9,
          speakers: speakerIndexes.map((speakerIndex) => ({
            speaker_id: `spk_${String(speakerIndex).padStart(3, "0")}`,
            speaker_index: speakerIndex,
            speaker_label: `Speaker ${speakerIndex}`,
            assigned_name: null,
            speaker_role: null,
            word_count: words.filter((word) => word.speaker_index === speakerIndex).length,
          })),
          utterances: utteranceIds.map((utteranceId, index) => {
            const utteranceWords = words.filter((word) => word.utterance_id === utteranceId);
            return {
              utterance_id: utteranceId,
              utterance_index: index,
              speaker_id: utteranceWords[0].speaker_id,
              speaker_index: utteranceWords[0].speaker_index,
              speaker_label: `Speaker ${utteranceWords[0].speaker_index}`,
              start_time: utteranceWords[0].start_time,
              end_time: utteranceWords[utteranceWords.length - 1].end_time,
              text: utteranceWords.map((word) => word.raw_text).join(" "),
              avg_confidence: 0.9,
            };
          }),
          words,
        },
        fallback_duration_seconds: endSeconds - startSeconds,
        virtual_chunk: {
          chunk_index: sourceIndex,
          start_seconds: startSeconds,
          end_seconds: endSeconds,
          nominal_offset_seconds: startSeconds,
          overlap_with_next_seconds: sourceIndex === 0 ? 2 : 0,
        },
      };
    };

    // Chunk 0: A=index0, B=index1. Overlap (8-10) has A@8-9 then B@9-10.
    const chunk0 = buildChunkSegment(0, 0, 10, [
      makeWord(0, "alpha", 0, 2, 0),
      makeWord(1, "beta", 4, 6, 1),
      makeWord(2, "shared-a", 8, 9, 0),
      makeWord(3, "shared-b", 9, 10, 1),
    ]);
    // Chunk 1: indices swapped — A=index1, B=index0. Same overlap words.
    const chunk1 = buildChunkSegment(1, 8, 18, [
      makeWord(0, "shared-a", 8, 9, 1),
      makeWord(1, "shared-b", 9, 10, 0),
      makeWord(2, "gamma", 12, 14, 0),
      makeWord(3, "delta", 16, 18, 1),
    ]);

    const merged = mergeSourceTranscriptSegments([chunk0, chunk1]);

    expect(merged.normalized.speakers).toHaveLength(2);

    const speakerIdByText = new Map(
      merged.normalized.words.map((word) => [word.raw_text, word.speaker_id]),
    );
    // Speaker A words share one identity across both chunks; B shares the other.
    expect(speakerIdByText.get("alpha")).toBe(speakerIdByText.get("shared-a"));
    expect(speakerIdByText.get("shared-a")).toBe(speakerIdByText.get("delta"));
    expect(speakerIdByText.get("beta")).toBe(speakerIdByText.get("shared-b"));
    expect(speakerIdByText.get("shared-b")).toBe(speakerIdByText.get("gamma"));
    expect(speakerIdByText.get("alpha")).not.toBe(speakerIdByText.get("beta"));
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

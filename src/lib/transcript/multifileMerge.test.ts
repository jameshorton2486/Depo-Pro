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

  it("keeps genuine repeated words within a chunk (only cross-chunk seam duplicates are collapsed)", () => {
    // A real stutter/repeat ("that that") lands two identically-spelled words
    // within the 0.35s dedup tolerance. Because they share a source chunk they
    // must both survive — Deepgram never emits the same word twice in one chunk,
    // so an intra-chunk match is a real word, not a seam duplicate.
    const first = buildSegment("case_repeat_a", 0, {
      sourceAudioId: "audio_repeat",
      virtualChunk: {
        chunkIndex: 0,
        startSeconds: 0,
        endSeconds: 12.4,
        nominalOffsetSeconds: 0,
        overlapWithNextSeconds: 2,
      },
    });
    const anchorWord = first.normalized.words[0];
    const anchorUtteranceId = anchorWord.utterance_id;
    first.normalized.words.push(
      { ...anchorWord, word_id: "w_repeat_1", raw_text: "that", utterance_id: anchorUtteranceId, start_time: 5.0, end_time: 5.2, confidence: 0.9 },
      { ...anchorWord, word_id: "w_repeat_2", raw_text: "that", utterance_id: anchorUtteranceId, start_time: 5.3, end_time: 5.5, confidence: 0.9 },
    );

    // Second chunk is a DISTINCT recording with no timing overlap, so nothing
    // cross-dedupes and the assertion isolates the intra-chunk behavior.
    const second = buildSegment("case_repeat_b", 1, {
      sourceAudioId: "audio_repeat",
      virtualChunk: {
        chunkIndex: 1,
        startSeconds: 40,
        endSeconds: 52.4,
        nominalOffsetSeconds: 40,
        overlapWithNextSeconds: 0,
      },
    });

    const merged = mergeSourceTranscriptSegments([first, second]);
    const repeatCount = merged.normalized.words.filter((word) => word.raw_text === "that").length;

    expect(repeatCount).toBe(2);
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

  // Tier 2 edge case — very long audio: three overlapping virtual chunks exercise
  // the double-seam path (the middle chunk overlaps both neighbors). We assert
  // structural invariants that hold regardless of exact seam-dedup counts.
  it("merges three overlapping virtual chunks without orphaning words or breaking word ordering", () => {
    const chunks = [0, 1, 2].map((index) => buildSegment("case_three_chunk", index, {
      sourceAudioId: "audio_shared",
      virtualChunk: {
        chunkIndex: index,
        startSeconds: index * 2,
        endSeconds: index * 2 + 12.4,
        nominalOffsetSeconds: index * 2,
        overlapWithNextSeconds: index < 2 ? 2 : 0,
      },
    }));

    const merged = mergeSourceTranscriptSegments(chunks);

    // No orphaned words across the double seam.
    const utteranceIds = new Set(merged.normalized.utterances.map((utt) => utt.utterance_id));
    for (const word of merged.normalized.words) {
      expect(word.utterance_id).not.toBe("");
      expect(utteranceIds.has(word.utterance_id)).toBe(true);
    }
    // word_index stays strictly increasing after re-sequencing.
    const wordIndices = merged.normalized.words.map((word) => word.word_index);
    for (let i = 1; i < wordIndices.length; i += 1) {
      expect(wordIndices[i]).toBeGreaterThan(wordIndices[i - 1]);
    }
    // Dedup bounds: at least one chunk's words survive, never more than all three.
    const singleChunkWordCount = chunks[0].normalized.words.length;
    expect(merged.normalized.words.length).toBeGreaterThanOrEqual(singleChunkWordCount);
    expect(merged.normalized.words.length).toBeLessThanOrEqual(singleChunkWordCount * 3);
    // Speaker identity stays stable across all three chunks.
    expect(new Set(merged.normalized.speakers.map((speaker) => speaker.speaker_id))).toEqual(new Set([
      "spk_audio_shared_s000",
      "spk_audio_shared_s001",
    ]));
  });

  // Tier 2 edge case — very short / silent audio: a zero-word source must resolve
  // its duration from metadata (no crash), and fail LOUDLY when no duration
  // exists anywhere rather than persist a 0-length transcript.
  it("resolves duration for a zero-word single source from metadata without throwing", () => {
    const segment = buildSegment("case_zero_word", 0, { metadataDuration: 8 });
    segment.normalized.words = [];
    segment.normalized.utterances = [];
    segment.normalized.speakers = [];
    segment.normalized.durationSeconds = Number.NaN; // force the metadata fallback

    const merged = mergeSourceTranscriptSegments([segment]);

    expect(merged.normalized.words).toHaveLength(0);
    expect(merged.segments[0].duration_seconds).toBe(8);
  });

  it("throws a clear error when a zero-word source has no duration metadata anywhere", () => {
    const segment = buildSegment("case_zero_word_nodur", 0, {
      metadataDuration: Number.NaN,
      fallbackDurationSeconds: null,
    });
    segment.normalized.words = [];
    segment.normalized.durationSeconds = Number.NaN;

    expect(() => mergeSourceTranscriptSegments([segment])).toThrow(/missing duration metadata/);
  });
});

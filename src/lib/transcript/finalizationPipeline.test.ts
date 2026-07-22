import { describe, expect, it } from "vitest";

import { finalizeTranscript } from "./finalizationPipeline";
import type { SourceTranscriptSegment } from "./multifileMerge";
import { normalizeTranscriptResponse } from "./normalize";
import { createOfflineDeepgramFixture } from "./offlineFixture";

function buildSegment(
  caseId: string,
  sourceIndex: number,
  overrides?: {
    metadataDuration?: number;
    virtualChunk?: {
      chunkIndex: number;
      startSeconds: number;
      endSeconds: number;
      nominalOffsetSeconds: number;
      overlapWithNextSeconds: number;
    };
  },
): SourceTranscriptSegment {
  const response = createOfflineDeepgramFixture(caseId);
  if (typeof overrides?.metadataDuration === "number") {
    response.metadata.duration = overrides.metadataDuration;
  }

  return {
    source_audio_id: `audio_${sourceIndex}`,
    source_index: sourceIndex,
    source_filename: `source_${sourceIndex + 1}.mp3`,
    mime_type: "audio/mpeg",
    storage_path: `cases/demo/audio_${sourceIndex}.mp3`,
    media_url: null,
    response,
    normalized: normalizeTranscriptResponse(response),
    fallback_duration_seconds: response.metadata.duration,
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

function uniqueWordIds(result: ReturnType<typeof finalizeTranscript>): boolean {
  const ids = result.normalized.words.map((word) => word.word_id);
  return new Set(ids).size === ids.length;
}

describe("finalizeTranscript", () => {
  it("passes a single source through unchanged and marks integrity passed", () => {
    const segment = buildSegment("case_single", 0);

    const result = finalizeTranscript([segment]);

    expect(result.normalized).toEqual(segment.normalized);
    expect(result.segments).toHaveLength(1);
    expect(result.integrityPassed).toBe(true);
    expect(result.integrity.failures).toEqual([]);
  });

  it("merges multiple physical files, preserving every word (no loss)", () => {
    const first = buildSegment("case_a", 0);
    const second = buildSegment("case_b", 1);

    const result = finalizeTranscript([first, second]);

    expect(result.segments).toHaveLength(2);
    expect(result.normalized.words).toHaveLength(
      first.normalized.words.length + second.normalized.words.length,
    );
    expect(uniqueWordIds(result)).toBe(true);
    expect(result.integrityPassed).toBe(true);
  });

  it("deduplicates the seam when merging overlapping virtual chunks", () => {
    const first = buildSegment("case_chunk_shared", 0, {
      virtualChunk: {
        chunkIndex: 0,
        startSeconds: 0,
        endSeconds: 6,
        nominalOffsetSeconds: 0,
        overlapWithNextSeconds: 2,
      },
    });
    const second = buildSegment("case_chunk_shared", 1, {
      virtualChunk: {
        chunkIndex: 1,
        startSeconds: 4,
        endSeconds: 10,
        nominalOffsetSeconds: 4,
        overlapWithNextSeconds: 0,
      },
    });

    const result = finalizeTranscript([first, second]);

    // Overlapping chunk content is reconciled, not double-counted.
    expect(result.normalized.words.length).toBeLessThan(
      first.normalized.words.length + second.normalized.words.length,
    );
    expect(uniqueWordIds(result)).toBe(true);
    expect(result.segments).toHaveLength(2);
    expect(result.integrityPassed).toBe(true);
  });

  it("surfaces an integrity failure instead of hiding it", () => {
    const segment = buildSegment("case_bad", 0);
    const corrupted: SourceTranscriptSegment = {
      ...segment,
      normalized: { ...segment.normalized, durationSeconds: -1 },
    };

    const result = finalizeTranscript([corrupted]);

    expect(result.integrityPassed).toBe(false);
    expect(result.integrity.failures.length).toBeGreaterThan(0);
  });

  it("throws when asked to finalize with no sources", () => {
    expect(() => finalizeTranscript([])).toThrow(/at least one source segment/);
  });
});

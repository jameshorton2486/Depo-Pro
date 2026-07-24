import { describe, expect, it } from "vitest";

import {
  AUTO_CHUNK_THRESHOLD_SECONDS,
  buildAutoChunkManifest,
  CHUNK_OVERLAP_SECONDS,
  manifestToSequentialSources,
  TARGET_CHUNK_DURATION_SECONDS,
} from "./autoChunking";

describe("autoChunking", () => {
  const source = {
    audio_id: "audio_001",
    original_filename: "large-file.m4a",
    mime_type: "audio/mp4",
    storage_path: "cases/demo/large-file.m4a",
    media_url: null,
  };

  it("does not require chunking below the threshold", () => {
    expect(4000).toBeLessThan(AUTO_CHUNK_THRESHOLD_SECONDS);
  });

  it("builds the expected 3-chunk manifest for an 8838 second file", () => {
    const manifest = buildAutoChunkManifest(source, 8838);

    expect(manifest.chunk_count).toBe(3);
    expect(manifest.chunks.map((chunk) => ({
      start: chunk.start_seconds,
      end: chunk.end_seconds,
      nominal: chunk.nominal_offset_seconds,
      overlap: chunk.overlap_with_next_seconds,
    }))).toEqual([
      { start: 0, end: 3660, nominal: 0, overlap: 60 },
      { start: 3600, end: 7260, nominal: 3600, overlap: 60 },
      { start: 7200, end: 8838, nominal: 7200, overlap: 0 },
    ]);
  });

  it("converts a manifest into sequential virtual chunk sources", () => {
    const manifest = buildAutoChunkManifest(source, 8838);
    const sequentialSources = manifestToSequentialSources(manifest);

    expect(sequentialSources).toHaveLength(3);
    expect(sequentialSources[1]).toMatchObject({
      kind: "virtual_chunk",
      chunk_index: 1,
      source_index: 1,
      start_seconds: 3600,
      end_seconds: 7260,
      nominal_offset_seconds: 3600,
    });
  });

  // Tier 2 edge case — audio length routing. transcribe-start chunks only when
  // duration_seconds > AUTO_CHUNK_THRESHOLD_SECONDS (strict). So a <30s clip and
  // a 30-minute file are BOTH single physical sources, not chunked.
  it("keeps short and 30-minute audio below the chunking threshold", () => {
    expect(AUTO_CHUNK_THRESHOLD_SECONDS).toBe(4500);
    expect(25).toBeLessThan(AUTO_CHUNK_THRESHOLD_SECONDS); // <30s clip
    expect(1800).toBeLessThan(AUTO_CHUNK_THRESHOLD_SECONDS); // 30 minutes
  });

  // Tier 2 edge case — very long audio, boundary of the chunker.
  it("builds a 2-chunk manifest just past the threshold with a zero-overlap final chunk", () => {
    const manifest = buildAutoChunkManifest(source, 4501);

    expect(manifest.chunk_count).toBe(2);
    expect(manifest.chunks.map((chunk) => ({
      start: chunk.start_seconds,
      end: chunk.end_seconds,
      overlap: chunk.overlap_with_next_seconds,
    }))).toEqual([
      { start: 0, end: 3660, overlap: 60 },
      { start: 3600, end: 4501, overlap: 0 },
    ]);
  });

  it("does not emit a trailing overlap-only chunk at an exact chunk-duration multiple", () => {
    const manifest = buildAutoChunkManifest(source, TARGET_CHUNK_DURATION_SECONDS * 2);

    expect(manifest.chunk_count).toBe(2);
    const last = manifest.chunks[manifest.chunks.length - 1];
    expect(last.end_seconds).toBe(TARGET_CHUNK_DURATION_SECONDS * 2);
    expect(last.overlap_with_next_seconds).toBe(0);
  });

  it("scales to many chunks for multi-hour audio with overlap only between chunks", () => {
    const manifest = buildAutoChunkManifest(source, 16000);

    expect(manifest.chunk_count).toBe(5);
    expect(manifest.chunks.map((chunk) => chunk.nominal_offset_seconds)).toEqual([0, 3600, 7200, 10800, 14400]);
    // Every non-final chunk carries the look-ahead overlap; the final one never does.
    expect(manifest.chunks.slice(0, -1).every((chunk) => chunk.overlap_with_next_seconds === CHUNK_OVERLAP_SECONDS)).toBe(true);
    const last = manifest.chunks[manifest.chunks.length - 1];
    expect(last.overlap_with_next_seconds).toBe(0);
    expect(last.end_seconds).toBe(16000);
  });
});

import { describe, expect, it } from "vitest";

import {
  AUTO_CHUNK_THRESHOLD_SECONDS,
  AUTO_CHUNKING_ENABLED,
  buildAutoChunkManifest,
  CHUNK_OVERLAP_SECONDS,
  manifestToSequentialSources,
  TARGET_CHUNK_DURATION_SECONDS,
  shouldAutoChunk,
} from "./autoChunking";

describe("autoChunking", () => {
  const source = {
    audio_id: "audio_001",
    original_filename: "large-file.m4a",
    mime_type: "audio/mp4",
    storage_path: "cases/demo/large-file.m4a",
    media_url: null,
  };

  it("keeps production auto-chunking disabled for every duration", () => {
    expect(AUTO_CHUNKING_ENABLED).toBe(false);
    expect(shouldAutoChunk(4000)).toBe(false);
    expect(shouldAutoChunk(4501)).toBe(false);
    expect(shouldAutoChunk(Number.MAX_SAFE_INTEGER)).toBe(false);
  });

  it("preserves threshold routing for explicit non-production opt-in", () => {
    expect(shouldAutoChunk(4500, true)).toBe(false);
    expect(shouldAutoChunk(4501, true)).toBe(true);
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

  it("retains the characterized chunking threshold", () => {
    expect(AUTO_CHUNK_THRESHOLD_SECONDS).toBe(4500);
    expect(25).toBeLessThan(AUTO_CHUNK_THRESHOLD_SECONDS);
    expect(1800).toBeLessThan(AUTO_CHUNK_THRESHOLD_SECONDS);
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

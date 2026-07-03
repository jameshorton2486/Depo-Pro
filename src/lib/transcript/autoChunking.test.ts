import { describe, expect, it } from "vitest";

import {
  AUTO_CHUNK_THRESHOLD_SECONDS,
  buildAutoChunkManifest,
  manifestToSequentialSources,
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
});

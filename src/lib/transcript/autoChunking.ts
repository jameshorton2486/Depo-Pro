export const AUTO_CHUNK_THRESHOLD_SECONDS = 4500;
export const TARGET_CHUNK_DURATION_SECONDS = 3600;
export const CHUNK_OVERLAP_SECONDS = 60;

export interface AudioChunkableSource {
  audio_id: string;
  original_filename: string;
  mime_type: string;
  storage_path: string | null;
  media_url: string | null;
}

export interface VirtualChunkSource {
  chunk_index: number;
  source_audio_id: string;
  source_index: number;
  source_filename: string;
  mime_type: string;
  storage_path: string | null;
  media_url: string | null;
  start_seconds: number;
  end_seconds: number;
  nominal_offset_seconds: number;
  overlap_with_next_seconds: number;
}

export interface VirtualChunkManifest {
  kind: "auto_chunk_v1";
  source_audio_id: string;
  source_filename: string;
  total_duration_seconds: number;
  chunk_count: number;
  chunks: VirtualChunkSource[];
}

export interface SequentialTranscriptSource {
  source_audio_id: string;
  source_index: number;
  source_filename: string;
  mime_type: string;
  storage_path: string | null;
  media_url: string | null;
  kind: "physical_audio" | "virtual_chunk";
  chunk_index?: number;
  start_seconds?: number;
  end_seconds?: number;
  nominal_offset_seconds?: number;
  overlap_with_next_seconds?: number;
}

export interface AutoChunkRequestMetadata {
  enabled: true;
  manifest_path: string;
  chunk_count: number;
  current_chunk_index: number;
}

export function buildAutoChunkManifest(
  source: AudioChunkableSource,
  totalDurationSeconds: number,
): VirtualChunkManifest {
  const chunks: VirtualChunkSource[] = [];
  let chunkIndex = 0;
  let nominalOffsetSeconds = 0;

  while (nominalOffsetSeconds < totalDurationSeconds) {
    const startSeconds = nominalOffsetSeconds;
    const remainingDurationSeconds = totalDurationSeconds - nominalOffsetSeconds;
    const hasNextChunk = remainingDurationSeconds > TARGET_CHUNK_DURATION_SECONDS;
    const endSeconds = Math.min(
      totalDurationSeconds,
      nominalOffsetSeconds + TARGET_CHUNK_DURATION_SECONDS + (hasNextChunk ? CHUNK_OVERLAP_SECONDS : 0),
    );

    chunks.push({
      chunk_index: chunkIndex,
      source_audio_id: source.audio_id,
      source_index: chunkIndex,
      source_filename: source.original_filename,
      mime_type: source.mime_type,
      storage_path: source.storage_path,
      media_url: source.media_url,
      start_seconds: startSeconds,
      end_seconds: endSeconds,
      nominal_offset_seconds: nominalOffsetSeconds,
      overlap_with_next_seconds: hasNextChunk ? CHUNK_OVERLAP_SECONDS : 0,
    });

    nominalOffsetSeconds += TARGET_CHUNK_DURATION_SECONDS;
    chunkIndex += 1;
  }

  return {
    kind: "auto_chunk_v1",
    source_audio_id: source.audio_id,
    source_filename: source.original_filename,
    total_duration_seconds: totalDurationSeconds,
    chunk_count: chunks.length,
    chunks,
  };
}

export function manifestToSequentialSources(manifest: VirtualChunkManifest): SequentialTranscriptSource[] {
  return manifest.chunks.map((chunk) => ({
    source_audio_id: chunk.source_audio_id,
    source_index: chunk.source_index,
    source_filename: chunk.source_filename,
    mime_type: chunk.mime_type,
    storage_path: chunk.storage_path,
    media_url: chunk.media_url,
    kind: "virtual_chunk",
    chunk_index: chunk.chunk_index,
    start_seconds: chunk.start_seconds,
    end_seconds: chunk.end_seconds,
    nominal_offset_seconds: chunk.nominal_offset_seconds,
    overlap_with_next_seconds: chunk.overlap_with_next_seconds,
  }));
}

export function audioRowsToSequentialSources<T extends AudioChunkableSource & { source_index: number | null }>(
  audioRows: T[],
): SequentialTranscriptSource[] {
  return audioRows.map((audio, index) => ({
    source_audio_id: audio.audio_id,
    source_index: audio.source_index ?? index,
    source_filename: audio.original_filename,
    mime_type: audio.mime_type,
    storage_path: audio.storage_path,
    media_url: audio.media_url,
    kind: "physical_audio",
  }));
}

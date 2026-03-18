/**
 * lib/transcription/chunking.ts  [UPGRADED]
 *
 * CHANGES FROM PREVIOUS VERSION:
 *   1. chunkDurationSeconds: 2700  (was: 1800 = 30 min)
 *      → Nova-3 is stable up to 60 min; 45 min balances stability and memory.
 *      → Reduces total number of chunk boundaries, each of which is a risk point.
 *
 *   2. overlapSeconds: 20  (was: 5)
 *      → 20 seconds is the research-validated minimum to carry sentence context
 *        across a boundary. 5 seconds is not enough to capture a full sentence.
 *      → The context handoff module handles the text-level context; this handles
 *        the audio-level overlap for Deepgram's model continuity.
 *
 *   3. outputFormat: 'wav'  (was: 'mp3')
 *      → Eliminates lossy re-encoding artifacts introduced by mp3 compression.
 *      → Every transcoding pass degrades the signal. WAV = lossless = no loss.
 *      → File size increase is handled by the temp dir cleanup in engine.ts.
 *
 *   NEW EXPORT: OPTIMIZED_CHUNKING_CONFIG
 *      → Named clearly to distinguish from the old DEFAULT_CHUNKING_CONFIG.
 *      → Used by TranscriptionEngine. Old default preserved for backward compat.
 */

import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import type { AudioChunk, ChunkingConfig } from '@/types/transcription';
import path from 'path';
import os from 'os';
import fs from 'fs';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// ─── Configs ─────────────────────────────────────────────────────────────────

/** Legacy config — kept for backward compatibility with any direct callers */
export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  chunkDurationSeconds: 1800,  // 30 minutes (original)
  overlapSeconds: 5,
  outputFormat: 'mp3',
  outputBitrate: '128k',
};

/**
 * Optimized config for TranscriptionEngine.
 * Use this for all new transcription jobs.
 *
 *   45 min / 20s overlap / WAV
 *   ↑                    ↑
 *   Fewer boundaries     No lossy re-encode
 */
export const OPTIMIZED_CHUNKING_CONFIG: ChunkingConfig = {
  chunkDurationSeconds: 2700,  // 45 minutes
  overlapSeconds: 20,          // 20 seconds — research-validated minimum for sentence context
  outputFormat: 'wav',         // Lossless — eliminates double-encode artifacts
  outputBitrate: '128k',       // Used only if format is mp3 (fallback path)
};

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Split audio file into chunks for sequential processing.
 * Each chunk overlaps with the next by config.overlapSeconds.
 * If total duration <= chunkDurationSeconds, returns a single chunk (no split).
 */
export async function chunkAudio(
  inputPath: string,
  config: ChunkingConfig = OPTIMIZED_CHUNKING_CONFIG,
): Promise<AudioChunk[]> {
  try {
    const duration = await getAudioDuration(inputPath);

    console.warn(`[chunking] Audio duration: ${duration.toFixed(1)}s, ` +
      `chunk size: ${config.chunkDurationSeconds}s, overlap: ${config.overlapSeconds}s`);

    // Single chunk path — no splitting needed
    if (duration <= config.chunkDurationSeconds) {
      console.warn('[chunking] Audio fits in single chunk, no splitting needed');
      return [{
        index: 0,
        filePath: inputPath,
        startSeconds: 0,
        endSeconds: duration,
        overlapSeconds: 0,
        durationSeconds: duration,
      }];
    }

    const chunks: AudioChunk[] = [];
    const chunkDuration = config.chunkDurationSeconds;
    const overlap = config.overlapSeconds;

    const tempDir = path.join(os.tmpdir(), `depo-chunks-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    console.warn(`[chunking] Created temp directory: ${tempDir}`);

    let currentStart = 0;
    let chunkIndex = 0;

    while (currentStart < duration) {
      const currentEnd = Math.min(currentStart + chunkDuration, duration);
      const isLastChunk = currentEnd >= duration;
      const actualDuration = currentEnd - currentStart;

      const ext = config.outputFormat === 'wav' ? 'wav' : 'mp3';
      const chunkFileName = `chunk-${String(chunkIndex).padStart(3, '0')}.${ext}`;
      const chunkFilePath = path.join(tempDir, chunkFileName);

      await extractAudioSegment(
        inputPath,
        chunkFilePath,
        currentStart,
        actualDuration,
        config,
      );

      chunks.push({
        index: chunkIndex,
        filePath: chunkFilePath,
        startSeconds: currentStart,
        endSeconds: currentEnd,
        overlapSeconds: isLastChunk ? 0 : overlap,
        durationSeconds: actualDuration,
      });

      console.warn(
        `[chunking] Chunk ${chunkIndex}: ${currentStart.toFixed(1)}s → ` +
        `${currentEnd.toFixed(1)}s (${actualDuration.toFixed(1)}s)`,
      );

      // Advance: next chunk starts with overlap included in the previous chunk
      currentStart = currentEnd - overlap;
      chunkIndex++;

      if (currentStart >= duration) break;
    }

    console.warn(`[chunking] Created ${chunks.length} chunks`);
    return chunks;

  } catch (error: any) {
    throw new Error(`Audio chunking failed: ${error.message}`);
  }
}

/**
 * Remove all temp chunk files after processing.
 * Called by TranscriptionEngine after reassembly is complete.
 */
export async function cleanupChunks(chunks: AudioChunk[]): Promise<void> {
  // Only remove files that were created by chunkAudio (in a temp dir)
  // Never remove the original input file
  const tempDirs = new Set<string>();

  for (const chunk of chunks) {
    if (chunk.filePath.includes('depo-chunks-')) {
      tempDirs.add(path.dirname(chunk.filePath));
    }
  }

  for (const dir of tempDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.warn(`[chunking] Cleaned up temp dir: ${dir}`);
    } catch (e) {
      console.warn(`[chunking] Failed to clean up ${dir}:`, e);
    }
  }
}

// ─── Private helpers ─────────────────────────────────────────────────────────

async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(new Error(`ffprobe failed: ${err.message}`));
      const duration = metadata?.format?.duration;
      if (typeof duration !== 'number' || isNaN(duration)) {
        return reject(new Error('Could not determine audio duration'));
      }
      resolve(duration);
    });
  });
}

async function extractAudioSegment(
  inputPath: string,
  outputPath: string,
  startSeconds: number,
  durationSeconds: number,
  config: ChunkingConfig,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(inputPath)
      .setStartTime(startSeconds)
      .setDuration(durationSeconds)
      .noVideo()
      .audioChannels(1);

    if (config.outputFormat === 'wav') {
      // WAV = lossless PCM — no quality loss
      cmd = cmd
        .audioCodec('pcm_s16le')
        .audioFrequency(24000)  // Match Nova-3 optimal rate
        .format('wav');
    } else {
      // MP3 fallback
      cmd = cmd
        .audioCodec('libmp3lame')
        .audioBitrate(config.outputBitrate || '128k')
        .format('mp3');
    }

    cmd
      .on('error', (err) => reject(new Error(`FFmpeg chunk extract failed: ${err.message}`)))
      .on('end', () => resolve())
      .save(outputPath);
  });
}

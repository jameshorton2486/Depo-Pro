// lib/transcription/chunking.ts
// Audio chunking with optional Voice Activity Detection (VAD) boundary snapping.
//
// VAD EXPLAINED:
//   FFmpeg's silencedetect filter scans the audio and reports timestamps where
//   audio drops below a threshold (default -40dB) for at least N seconds.
//   We use these timestamps as "safe" cut points — no sentence is split mid-word.
//
//   Without VAD: cut at exactly 45:00.000 regardless of speech
//   With VAD:    cut at 45:23.4 because that's the nearest silence after 45:00
//
//   The scan window is configurable (default: look up to 60s past the target).
//   If no silence is found in that window, fall back to the hard boundary.
//   This guarantees chunks are always produced even for continuous speech.

import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import type { AudioChunk, ChunkingConfig } from '@/types/transcription';
import path from 'path';
import os from 'os';
import fs from 'fs';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// ─── Configs ──────────────────────────────────────────────────────────────────

/**
 * Legacy config — preserved for backward compatibility.
 * Any existing callers of DEFAULT_CHUNKING_CONFIG continue to work unchanged.
 */
export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  chunkDurationSeconds: 1800,
  overlapSeconds: 5,
  outputFormat: 'mp3',
  outputBitrate: '128k',
  useVAD: false,
};

/**
 * Production config for all new transcription jobs.
 *
 * Changes from DEFAULT:
 *   chunkDurationSeconds: 2700  (45 min — Nova-3 stable range, fewer boundaries)
 *   overlapSeconds:       20    (research minimum for full sentence context)
 *   outputFormat:         'wav' (lossless — no double-encode artifacts)
 *   useVAD:               true  (find natural silence, never cut mid-sentence)
 */
export const OPTIMIZED_CHUNKING_CONFIG: ChunkingConfig = {
  chunkDurationSeconds: 2700,
  overlapSeconds: 20,
  outputFormat: 'wav',
  outputBitrate: '128k',
  useVAD: true,
  silenceMinDuration: 0.5,
  silenceThresholdDb: -40,
  silenceScanWindowSeconds: 60,
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface SilencePoint {
  start: number;
  end: number;
  mid: number;
  duration: number;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Split audio into chunks for sequential transcription.
 *
 * If config.useVAD is true (default in OPTIMIZED_CHUNKING_CONFIG):
 *   Finds the nearest natural silence after each target boundary.
 *   Never cuts mid-sentence. Falls back to hard boundary if no silence found.
 *
 * If config.useVAD is false (DEFAULT_CHUNKING_CONFIG):
 *   Cuts at exactly chunkDurationSeconds regardless of speech state.
 */
export async function chunkAudio(
  inputPath: string,
  config: ChunkingConfig = OPTIMIZED_CHUNKING_CONFIG,
): Promise<AudioChunk[]> {
  try {
    const duration = await getAudioDuration(inputPath);
    const useVAD = config.useVAD !== false;

    console.warn(
      `[chunking] duration=${duration.toFixed(1)}s ` +
      `target=${config.chunkDurationSeconds}s ` +
      `overlap=${config.overlapSeconds}s ` +
      `format=${config.outputFormat} ` +
      `VAD=${useVAD}`,
    );

    if (duration <= config.chunkDurationSeconds) {
      console.warn('[chunking] Audio fits in single chunk — no splitting needed');
      return [{
        index: 0,
        filePath: inputPath,
        startSeconds: 0,
        endSeconds: duration,
        overlapSeconds: 0,
        durationSeconds: duration,
      }];
    }

    const tempDir = path.join(os.tmpdir(), `depo-chunks-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    let silencePoints: SilencePoint[] = [];
    if (useVAD) {
      silencePoints = await detectSilencePoints(inputPath, {
        minDuration: config.silenceMinDuration ?? 0.5,
        thresholdDb: config.silenceThresholdDb ?? -40,
      });
      console.warn(`[chunking] VAD: found ${silencePoints.length} silence points`);
    }

    const chunks: AudioChunk[] = [];
    const scanWindow = config.silenceScanWindowSeconds ?? 60;
    let currentStart = 0;
    let chunkIndex = 0;

    while (currentStart < duration) {
      const hardEnd = Math.min(currentStart + config.chunkDurationSeconds, duration);
      const isLastChunk = hardEnd >= duration;

      let cutPoint: number;
      if (isLastChunk) {
        cutPoint = hardEnd;
      } else if (useVAD && silencePoints.length > 0) {
        const scanLimit = Math.min(hardEnd + scanWindow, duration);
        const candidate = findBestSilenceCut(silencePoints, hardEnd, scanLimit);

        if (candidate !== null) {
          console.warn(
            `[chunking] VAD: snapped chunk ${chunkIndex} boundary ` +
            `${hardEnd.toFixed(1)}s → ${candidate.toFixed(1)}s ` +
            `(+${(candidate - hardEnd).toFixed(1)}s to reach silence)`,
          );
          cutPoint = candidate;
        } else {
          console.warn(
            `[chunking] VAD: no silence found within ${scanWindow}s of ` +
            `${hardEnd.toFixed(1)}s — using hard boundary`,
          );
          cutPoint = hardEnd;
        }
      } else {
        cutPoint = hardEnd;
      }

      const actualDuration = cutPoint - currentStart;
      const ext = config.outputFormat === 'wav' ? 'wav' : 'mp3';
      const chunkFilePath = path.join(
        tempDir,
        `chunk-${String(chunkIndex).padStart(3, '0')}.${ext}`,
      );

      await extractAudioSegment(inputPath, chunkFilePath, currentStart, actualDuration, config);

      chunks.push({
        index: chunkIndex,
        filePath: chunkFilePath,
        startSeconds: currentStart,
        endSeconds: cutPoint,
        overlapSeconds: isLastChunk ? 0 : config.overlapSeconds,
        durationSeconds: actualDuration,
      });

      console.warn(
        `[chunking] Chunk ${chunkIndex}: ${currentStart.toFixed(1)}s → ` +
        `${cutPoint.toFixed(1)}s (${actualDuration.toFixed(1)}s)`,
      );

      if (isLastChunk) break;

      currentStart = cutPoint - config.overlapSeconds;
      chunkIndex++;
    }

    console.warn(`[chunking] Created ${chunks.length} chunks in ${tempDir}`);
    return chunks;

  } catch (error: any) {
    throw new Error(`Audio chunking failed: ${error.message}`);
  }
}

/**
 * Get audio duration in seconds via ffprobe.
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(new Error(`ffprobe error: ${err.message}`));
      const duration = metadata?.format?.duration ?? 0;
      if (duration <= 0) return reject(new Error('Invalid audio duration: 0 seconds'));
      resolve(duration);
    });
  });
}

/**
 * Remove all temp chunk files after processing.
 */
export async function cleanupChunks(chunks: AudioChunk[]): Promise<void> {
  if (chunks.length === 0) return;

  try {
    const firstChunkPath = chunks[0].filePath;
    const tempDir = path.dirname(firstChunkPath);

    if (!tempDir.includes('depo-chunks-')) {
      console.warn(`[chunking] Skipping cleanup: not a managed temp dir: ${tempDir}`);
      return;
    }

    for (const chunk of chunks) {
      if (fs.existsSync(chunk.filePath)) {
        fs.unlinkSync(chunk.filePath);
      }
    }

    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }

    console.warn('[chunking] Chunk cleanup complete');
  } catch (error: any) {
    console.error('[chunking] Cleanup error (non-fatal):', error.message);
  }
}

// ─── Private: VAD silence detection ──────────────────────────────────────────

/**
 * Run FFmpeg silencedetect filter over the entire file and return all silence periods.
 * Single pass — O(n) where n = file duration.
 */
async function detectSilencePoints(
  inputPath: string,
  options: { minDuration: number; thresholdDb: number },
): Promise<SilencePoint[]> {
  const nullOutput = process.platform === 'win32'
    ? path.join(os.tmpdir(), `silence-scan-${Date.now()}.null`)
    : '/dev/null';

  return new Promise((resolve) => {
    const points: SilencePoint[] = [];
    let pendingStart: number | null = null;

    ffmpeg(inputPath)
      .audioFilters(
        `silencedetect=noise=${options.thresholdDb}dB:duration=${options.minDuration}`,
      )
      .format('null')
      .output(nullOutput)
      .on('stderr', (line: string) => {
        const startMatch = line.match(/silence_start:\s*([\d.]+)/);
        if (startMatch) {
          pendingStart = parseFloat(startMatch[1]);
        }

        const endMatch = line.match(/silence_end:\s*([\d.]+)/);
        if (endMatch && pendingStart !== null) {
          const end = parseFloat(endMatch[1]);
          const start = pendingStart;
          points.push({
            start,
            end,
            mid: (start + end) / 2,
            duration: end - start,
          });
          pendingStart = null;
        }
      })
      .on('end', () => {
        console.warn(`[chunking] Silence detection complete: ${points.length} periods found`);
        if (process.platform === 'win32' && fs.existsSync(nullOutput)) {
          try { fs.unlinkSync(nullOutput); } catch { /* non-fatal */ }
        }
        resolve(points);
      })
      .on('error', (err) => {
        console.warn(`[chunking] silencedetect failed (falling back to hard cuts): ${err.message}`);
        resolve([]);
      })
      .run();
  });
}

/**
 * Find the best silence cut point at or after targetTime, within maxTime.
 * Returns null if no silence point found in range.
 */
function findBestSilenceCut(
  silencePoints: SilencePoint[],
  targetTime: number,
  maxTime: number,
): number | null {
  const candidates = silencePoints.filter(
    (sp) => sp.mid >= targetTime && sp.mid <= maxTime,
  );

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => Math.abs(a.mid - targetTime) - Math.abs(b.mid - targetTime));
  return candidates[0].mid;
}

// ─── Private: audio extraction ────────────────────────────────────────────────

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
      cmd = cmd
        .audioCodec('pcm_s16le')
        .audioFrequency(24000)
        .format('wav');
    } else {
      cmd = cmd
        .audioCodec('libmp3lame')
        .audioBitrate(config.outputBitrate ?? '128k')
        .format('mp3');
    }

    cmd
      .on('end', () => resolve())
      .on('error', (err) => reject(new Error(`FFmpeg chunk extract failed: ${err.message}`)))
      .save(outputPath);
  });
}

// lib/transcription/chunking.ts

import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import type { AudioChunk, ChunkingConfig } from '@/types/transcription';
import path from 'path';
import os from 'os';
import fs from 'fs';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Default chunking config
export const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  chunkDurationSeconds: 1800,  // 30 minutes
  overlapSeconds: 5,
  outputFormat: 'mp3',
  outputBitrate: '128k',
};

/**
 * Split audio file into chunks for parallel/sequential processing.
 * Each chunk overlaps with the next by config.overlapSeconds.
 * If total duration <= chunkDurationSeconds, returns single chunk (no splitting).
 */
export async function chunkAudio(
  inputPath: string,
  config: ChunkingConfig = DEFAULT_CHUNKING_CONFIG
): Promise<AudioChunk[]> {
  try {
    // Get total duration via ffprobe
    const duration = await getAudioDuration(inputPath);

    console.log(`Audio duration: ${duration}s, chunk size: ${config.chunkDurationSeconds}s`);

    // If duration <= chunk size, return single chunk pointing to original file
    if (duration <= config.chunkDurationSeconds) {
      console.log('Audio fits in single chunk, no splitting needed');
      return [{
        index: 0,
        filePath: inputPath,
        startSeconds: 0,
        endSeconds: duration,
        overlapSeconds: 0,
        durationSeconds: duration,
      }];
    }

    // Calculate chunk boundaries
    const chunks: AudioChunk[] = [];
    const chunkDuration = config.chunkDurationSeconds;
    const overlap = config.overlapSeconds;

    // Create temp directory for chunks
    const tempDir = path.join(os.tmpdir(), `depo-chunks-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`Created temp directory: ${tempDir}`);

    let currentStart = 0;
    let chunkIndex = 0;

    while (currentStart < duration) {
      // Calculate this chunk's end time
      const currentEnd = Math.min(currentStart + chunkDuration, duration);
      const isLastChunk = currentEnd >= duration;
      const actualDuration = currentEnd - currentStart;

      // Output file path
      const chunkFileName = `chunk-${String(chunkIndex).padStart(3, '0')}.${config.outputFormat}`;
      const chunkFilePath = path.join(tempDir, chunkFileName);

      // Extract chunk using ffmpeg
      await extractAudioSegment(
        inputPath,
        chunkFilePath,
        currentStart,
        actualDuration,
        config.outputBitrate
      );

      chunks.push({
        index: chunkIndex,
        filePath: chunkFilePath,
        startSeconds: currentStart,
        endSeconds: currentEnd,
        overlapSeconds: isLastChunk ? 0 : overlap,
        durationSeconds: actualDuration,
      });

      console.log(`Created chunk ${chunkIndex}: ${currentStart}s - ${currentEnd}s (${actualDuration}s)`);

      // Move to next chunk start (accounting for overlap)
      // Next chunk starts at (currentEnd - overlap) to create the overlap region
      if (isLastChunk) {
        break;
      }

      currentStart = currentEnd - overlap;
      chunkIndex++;
    }

    console.log(`Audio split into ${chunks.length} chunks`);
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
      if (err) {
        reject(new Error(`ffprobe error: ${err.message}`));
        return;
      }

      const duration = metadata.format.duration || 0;

      if (duration <= 0) {
        reject(new Error('Invalid audio duration: 0 seconds'));
        return;
      }

      resolve(duration);
    });
  });
}

/**
 * Extract a segment from an audio file using ffmpeg.
 */
async function extractAudioSegment(
  inputPath: string,
  outputPath: string,
  startSeconds: number,
  durationSeconds: number,
  bitrate: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startSeconds)
      .setDuration(durationSeconds)
      .audioCodec('libmp3lame')
      .audioBitrate(bitrate)
      .on('start', (commandLine) => {
        console.log(`FFmpeg: ${commandLine}`);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          // Only log every 10% to reduce noise
          const percent = Math.floor(progress.percent / 10) * 10;
          if (percent > 0 && progress.percent >= percent && progress.percent < percent + 2) {
            console.log(`  Chunk extraction progress: ${percent}%`);
          }
        }
      })
      .on('end', () => {
        console.log(`  Chunk extraction complete: ${outputPath}`);
        resolve();
      })
      .on('error', (err) => {
        reject(new Error(`FFmpeg extraction failed: ${err.message}`));
      })
      .save(outputPath);
  });
}

/**
 * Clean up temporary chunk files after processing.
 */
export async function cleanupChunks(chunks: AudioChunk[]): Promise<void> {
  if (chunks.length === 0) {
    return;
  }

  try {
    // Get the parent directory from the first chunk
    // (all chunks should be in the same temp directory)
    const firstChunkPath = chunks[0].filePath;
    const tempDir = path.dirname(firstChunkPath);

    // Only clean up if it's in the temp directory (safety check)
    if (!tempDir.includes('depo-chunks-')) {
      console.warn(`Skipping cleanup: directory doesn't look like a temp chunk directory: ${tempDir}`);
      return;
    }

    // Delete all chunk files
    for (const chunk of chunks) {
      if (fs.existsSync(chunk.filePath)) {
        fs.unlinkSync(chunk.filePath);
        console.log(`Deleted chunk file: ${chunk.filePath}`);
      }
    }

    // Delete the temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
      console.log(`Deleted temp directory: ${tempDir}`);
    }

    console.log('Chunk cleanup complete');
  } catch (error: any) {
    console.error('Chunk cleanup error:', error.message);
    // Don't throw — cleanup errors shouldn't fail the pipeline
  }
}

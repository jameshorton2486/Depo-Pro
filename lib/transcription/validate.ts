// lib/transcription/validate.ts

import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import type { AudioValidation } from '@/types/transcription';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Set ffmpeg path from the static installer
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Validate an audio file using ffprobe.
 * For video files (MP4/MOV), extracts audio track to temp MP3.
 * Returns validation result with duration, format, channels, etc.
 */
export async function validateAudio(filePath: string): Promise<AudioValidation> {
  try {
    // Check file exists
    if (!fs.existsSync(filePath)) {
      return {
        valid: false,
        duration: 0,
        format: '',
        channels: 0,
        sampleRate: 0,
        fileSize: 0,
        error: `File not found: ${filePath}`,
      };
    }

    // Get file size
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // Max file size: 2GB
    const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
    if (fileSize > MAX_FILE_SIZE) {
      return {
        valid: false,
        duration: 0,
        format: '',
        channels: 0,
        sampleRate: 0,
        fileSize,
        error: `File too large: ${(fileSize / 1024 / 1024 / 1024).toFixed(2)}GB (max 2GB)`,
      };
    }

    // Run ffprobe to get metadata
    const metadata = await probeAudioFile(filePath);

    // Validate format
    const acceptedFormats = ['mp3', 'wav', 'm4a', 'mp4', 'mov', 'ogg', 'flac', 'webm', 'avi', 'mkv'];
    const format = metadata.format.toLowerCase();

    if (!acceptedFormats.includes(format)) {
      return {
        valid: false,
        duration: metadata.duration,
        format: metadata.format,
        channels: metadata.channels,
        sampleRate: metadata.sampleRate,
        fileSize,
        error: `Unsupported format: ${metadata.format}. Supported: ${acceptedFormats.join(', ')}`,
      };
    }

    // Validate duration
    if (metadata.duration <= 0) {
      return {
        valid: false,
        duration: metadata.duration,
        format: metadata.format,
        channels: metadata.channels,
        sampleRate: metadata.sampleRate,
        fileSize,
        error: 'Invalid duration: Audio file has no duration or is corrupted',
      };
    }

    // For video files, extract audio to temp MP3
    const videoFormats = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
    if (videoFormats.includes(format)) {
      console.log(`Video format detected (${format}), extracting audio...`);
      // Note: The pipeline orchestrator will handle extraction
      // For now, just validate that the video has an audio track
      if (metadata.hasAudioTrack === false) {
        return {
          valid: false,
          duration: metadata.duration,
          format: metadata.format,
          channels: metadata.channels,
          sampleRate: metadata.sampleRate,
          fileSize,
          error: 'Video file has no audio track',
        };
      }
    }

    // All checks passed
    return {
      valid: true,
      duration: metadata.duration,
      format: metadata.format,
      channels: metadata.channels,
      sampleRate: metadata.sampleRate,
      fileSize,
    };
  } catch (error: any) {
    return {
      valid: false,
      duration: 0,
      format: '',
      channels: 0,
      sampleRate: 0,
      fileSize: 0,
      error: `Validation error: ${error.message}`,
    };
  }
}

/**
 * Extract audio from a video file to a temp MP3.
 * Returns path to the extracted audio file.
 */
export async function extractAudioFromVideo(videoPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create temp output file path
      const tempDir = os.tmpdir();
      const fileName = `audio-extracted-${Date.now()}.mp3`;
      const outputPath = path.join(tempDir, fileName);

      console.log(`Extracting audio from ${videoPath} to ${outputPath}...`);

      // Use ffmpeg to extract audio:
      // -vn: no video
      // -acodec libmp3lame: encode audio as MP3
      // -b:a 128k: audio bitrate 128kbps
      ffmpeg(videoPath)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`Extraction progress: ${progress.percent.toFixed(1)}%`);
          }
        })
        .on('end', () => {
          console.log(`Audio extraction complete: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('FFmpeg extraction error:', err.message);
          reject(new Error(`Audio extraction failed: ${err.message}`));
        })
        .save(outputPath);
    } catch (error: any) {
      reject(new Error(`Failed to start audio extraction: ${error.message}`));
    }
  });
}

/**
 * Probe audio file using ffprobe to get metadata.
 * Returns duration, format, channels, sample rate, and audio track presence.
 */
async function probeAudioFile(filePath: string): Promise<{
  duration: number;
  format: string;
  channels: number;
  sampleRate: number;
  hasAudioTrack: boolean;
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(new Error(`ffprobe error: ${err.message}`));
        return;
      }

      try {
        // Get format info
        const formatName = metadata.format.format_name || '';
        const duration = metadata.format.duration || 0;

        // Try to find an audio stream
        const audioStream = metadata.streams.find(
          (stream) => stream.codec_type === 'audio'
        );

        if (!audioStream) {
          // No audio stream found (might be video-only)
          resolve({
            duration,
            format: formatName.split(',')[0] || 'unknown',
            channels: 0,
            sampleRate: 0,
            hasAudioTrack: false,
          });
          return;
        }

        const channels = audioStream.channels || 2;
        const sampleRate = audioStream.sample_rate
          ? parseInt(String(audioStream.sample_rate), 10)
          : 0;

        resolve({
          duration,
          format: formatName.split(',')[0] || 'unknown',
          channels,
          sampleRate,
          hasAudioTrack: true,
        });
      } catch (parseError: any) {
        reject(new Error(`Failed to parse ffprobe metadata: ${parseError.message}`));
      }
    });
  });
}

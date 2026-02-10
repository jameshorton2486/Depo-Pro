// lib/transcription/deepgram.ts

import { createClient } from '@deepgram/sdk';
import fs from 'fs';
import {
  DeepgramOptions,
  DeepgramResult,
  TranscriptionWord,
  TranscriptionSegment,
  SpeakerInfo,
} from '@/types/transcription';

// Default transcription options optimized for legal audio
export const DEFAULT_DEEPGRAM_OPTIONS: DeepgramOptions = {
  model: 'nova-3',
  smart_format: true,
  punctuate: true,
  diarize: true,
  utterances: true,
  language: 'en-US',
};

/**
 * Transcribe an audio buffer using Deepgram Nova-3.
 * Includes retry with exponential backoff (max 3 attempts).
 * Returns structured result with words, segments, speakers, and full transcript.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  options: Partial<DeepgramOptions> = {}
): Promise<DeepgramResult> {
  const mergedOptions = { ...DEFAULT_DEEPGRAM_OPTIONS, ...options };

  if (!process.env.DEEPGRAM_API_KEY) {
    throw new Error('DEEPGRAM_API_KEY environment variable is not set');
  }

  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

  // Build Deepgram request options
  const requestOptions: Record<string, any> = {
    model: mergedOptions.model,
    smart_format: mergedOptions.smart_format,
    punctuate: mergedOptions.punctuate,
    diarize: mergedOptions.diarize,
    utterances: mergedOptions.utterances,
    language: mergedOptions.language,
  };

  // Add keywords (vocabulary) if provided
  if (mergedOptions.keywords && mergedOptions.keywords.length > 0) {
    requestOptions.keywords = mergedOptions.keywords;
  }

  // Retry logic with exponential backoff
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Deepgram attempt ${attempt}/3...`);

      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        requestOptions
      );

      if (error) {
        throw new Error(`Deepgram API error: ${error.message || JSON.stringify(error)}`);
      }

      if (!result) {
        throw new Error('Deepgram returned no result');
      }

      // Transform Deepgram response into our typed result
      const transformedResult = transformDeepgramResponse(result);
      console.log(`Deepgram transcription successful: ${transformedResult.words.length} words`);
      return transformedResult;

    } catch (err: any) {
      lastError = err;
      console.error(`Deepgram attempt ${attempt}/3 failed:`, err.message);

      if (attempt < 3) {
        // Exponential backoff: 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Deepgram transcription failed after 3 attempts: ${lastError?.message}`);
}

/**
 * Transform raw Deepgram API response into our typed DeepgramResult.
 */
function transformDeepgramResponse(rawResult: any): DeepgramResult {
  try {
    const channel = rawResult?.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];

    if (!alternative) {
      throw new Error('Deepgram response missing transcript data');
    }

    // Extract words from result.results.channels[0].alternatives[0].words
    const rawWords = alternative.words || [];
    const words: TranscriptionWord[] = rawWords.map((w: any) => ({
      word: w.word || '',
      punctuated_word: w.punctuated_word || w.word || '',
      start: w.start || 0,
      end: w.end || 0,
      confidence: w.confidence || 0,
      speaker: w.speaker !== undefined
        ? `SPEAKER_${String(w.speaker).padStart(2, '0')}`
        : 'SPEAKER_00',
      speaker_channel: w.speaker !== undefined ? w.speaker : 0,
      is_flagged: false,  // Set during flag extraction phase
    }));

    // Extract segments from utterances (if available)
    const utterances = rawResult?.results?.utterances || [];
    const segments: TranscriptionSegment[] = utterances.map((utt: any) => ({
      text: utt.transcript || '',
      speaker: utt.speaker !== undefined
        ? `SPEAKER_${String(utt.speaker).padStart(2, '0')}`
        : 'SPEAKER_00',
      start: utt.start || 0,
      end: utt.end || 0,
      channel: utt.channel !== undefined ? utt.channel : 0,
      original_text: utt.transcript || '',
    }));

    // If no utterances, build segments from the transcript text
    if (segments.length === 0 && alternative.transcript) {
      segments.push({
        text: alternative.transcript,
        speaker: 'SPEAKER_00',
        start: words.length > 0 ? words[0].start : 0,
        end: words.length > 0 ? words[words.length - 1].end : 0,
        channel: 0,
        original_text: alternative.transcript,
      });
    }

    // Extract unique speakers
    const speakerSet = new Set<number>();
    words.forEach(w => speakerSet.add(w.speaker_channel));

    const speakers: SpeakerInfo[] = Array.from(speakerSet)
      .sort((a, b) => a - b)
      .map(speakerNum => {
        const label = `SPEAKER_${String(speakerNum).padStart(2, '0')}`;
        return {
          id: label,
          label,
          channel: speakerNum,
          original_label: label,
        };
      });

    // Build fullTranscript from segments with speaker labels
    const fullTranscript = buildTranscriptFromSegments(segments);

    return {
      words,
      segments,
      speakers,
      fullTranscript,
      rawJson: rawResult,
      confidence: calculateAverageConfidence(words),
    };
  } catch (error: any) {
    throw new Error(`Failed to transform Deepgram response: ${error.message}`);
  }
}

/**
 * Build full transcript text from segments with speaker labels.
 */
function buildTranscriptFromSegments(segments: TranscriptionSegment[]): string {
  if (segments.length === 0) {
    return '';
  }

  // Group consecutive segments by speaker
  const lines: string[] = [];
  let currentSpeaker: string | null = null;
  let currentText: string[] = [];

  for (const segment of segments) {
    if (segment.speaker !== currentSpeaker) {
      // Speaker changed — flush current line
      if (currentSpeaker !== null && currentText.length > 0) {
        lines.push(`${currentSpeaker}: ${currentText.join(' ')}`);
      }

      currentSpeaker = segment.speaker;
      currentText = [segment.text];
    } else {
      // Same speaker — append text
      currentText.push(segment.text);
    }
  }

  // Flush last line
  if (currentSpeaker !== null && currentText.length > 0) {
    lines.push(`${currentSpeaker}: ${currentText.join(' ')}`);
  }

  return lines.join('\n\n');
}

/**
 * Calculate average confidence across all words.
 */
function calculateAverageConfidence(words: TranscriptionWord[]): number {
  if (words.length === 0) {
    return 0;
  }

  const totalConfidence = words.reduce((sum, word) => sum + word.confidence, 0);
  return totalConfidence / words.length;
}

/**
 * Transcribe from a file path (convenience wrapper).
 * Reads file into buffer and calls transcribeAudio.
 */
export async function transcribeFile(
  filePath: string,
  options: Partial<DeepgramOptions> = {}
): Promise<DeepgramResult> {
  const buffer = fs.readFileSync(filePath);
  return transcribeAudio(buffer, options);
}

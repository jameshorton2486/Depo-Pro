/**
 * Deepgram Transcription Service for Depo-Pro
 *
 * Production-hardened implementation with real Deepgram API calls.
 * Provides word-level timestamps, confidence scores, and speaker diarization.
 *
 * INSTALLATION: npm install @deepgram/sdk
 */

import fs from 'fs';
import type { PrerecordedSchema, SyncPrerecordedResponse } from '@deepgram/sdk';
import { LEGAL_TRANSCRIPTION_OPTIONS, LEGAL_VOCABULARY } from './deepgram/client';
import type {
  TranscriptionResult,
  TranscriptWord,
  Utterance,
  FlaggedSegment,
  QualityReport,
} from '@/types/deepgram';

/** Words below this confidence are flagged for scopist review */
const LOW_CONFIDENCE_THRESHOLD = 0.85;

function requireDeepgramKey(): string {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key || key.trim() === '') {
    throw new Error('DEEPGRAM_API_KEY is required for transcription');
  }
  return key.trim();
}

/**
 * Transcribe audio using Deepgram with legal-optimized settings
 *
 * NOTE: Nova-3 uses `keyterm` (max 100) instead of `keywords`
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  options: {
    customKeyterms?: string[];
    modelPreference?: 'nova-3' | 'nova-2' | 'nova-2-medical';
  } = {},
): Promise<TranscriptionResult> {
  const apiKey = requireDeepgramKey();
  const { createClient } = await import('@deepgram/sdk');
  const deepgram = createClient(apiKey);

  const isNova3 = !options.modelPreference || options.modelPreference === 'nova-3';
  const customTerms = options.customKeyterms || [];
  const allTerms = [...customTerms, ...LEGAL_VOCABULARY];

  const transcriptionOptions: PrerecordedSchema = {
    ...LEGAL_TRANSCRIPTION_OPTIONS,
    model: options.modelPreference || 'nova-3',
  };

  if (isNova3) {
    transcriptionOptions.keyterm = allTerms.slice(0, 100);
  } else {
    transcriptionOptions.keywords = allTerms.slice(0, 1000);
  }

  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
    audioBuffer,
    transcriptionOptions,
  );

  if (error) {
    console.error('[Deepgram] API error', { message: error.message, code: (error as { code?: string }).code });
    throw new Error(`Deepgram transcription failed: ${error.message}`);
  }

  if (!result) {
    console.error('[Deepgram] No result returned');
    throw new Error('Deepgram returned no result');
  }

  return processDeepgramResponse(result);
}

/**
 * Transcribe audio from a URL (e.g., Supabase storage URL)
 */
export async function transcribeFromUrl(
  audioUrl: string,
  options: {
    customKeyterms?: string[];
    modelPreference?: 'nova-3' | 'nova-2' | 'nova-2-medical';
  } = {},
): Promise<TranscriptionResult> {
  const apiKey = requireDeepgramKey();
  const { createClient } = await import('@deepgram/sdk');
  const deepgram = createClient(apiKey);

  const isNova3 = !options.modelPreference || options.modelPreference === 'nova-3';
  const customTerms = options.customKeyterms || [];
  const allTerms = [...customTerms, ...LEGAL_VOCABULARY];

  const transcriptionOptions: PrerecordedSchema = {
    ...LEGAL_TRANSCRIPTION_OPTIONS,
    model: options.modelPreference || 'nova-3',
  };

  if (isNova3) {
    transcriptionOptions.keyterm = allTerms.slice(0, 100);
  } else {
    transcriptionOptions.keywords = allTerms.slice(0, 1000);
  }

  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    { url: audioUrl },
    transcriptionOptions,
  );

  if (error) {
    console.error('[Deepgram] API error', { message: error.message, code: (error as { code?: string }).code });
    throw new Error(`Deepgram transcription failed: ${error.message}`);
  }

  if (!result) {
    console.error('[Deepgram] No result returned');
    throw new Error('Deepgram returned no result');
  }

  return processDeepgramResponse(result);
}

/**
 * Transcribe from a file path (reads file into buffer and calls transcribeAudio).
 * Used by pipeline and scheduler.
 */
export async function transcribeFile(
  filePath: string,
  options: {
    customKeyterms?: string[];
    modelPreference?: 'nova-3' | 'nova-2' | 'nova-2-medical';
  } = {},
): Promise<TranscriptionResult> {
  const buffer = fs.readFileSync(filePath);
  return transcribeAudio(buffer, options);
}

/**
 * Convert TranscriptionResult to pipeline format (DeepgramChunkResult).
 * Maps words, utterances→segments, speakers, fullTranscript, rawJson.
 */
export function toPipelineFormat(result: TranscriptionResult): {
  words: Array<{
    word: string;
    punctuated_word: string;
    start: number;
    end: number;
    confidence: number;
    speaker: string;
    speaker_channel: number;
    is_flagged: boolean;
  }>;
  segments: Array<{
    text: string;
    speaker: string;
    start: number;
    end: number;
    channel: number;
    original_text: string;
  }>;
  speakers: Array<{
    id: string;
    label: string;
    channel: number;
    original_label: string;
  }>;
  fullTranscript: string;
  rawJson: SyncPrerecordedResponse;
  confidence: number;
} {
  const speakerSet = new Set<number>();
  for (const w of result.words) {
    if (w.speaker !== undefined) speakerSet.add(w.speaker);
  }
  for (const u of result.utterances) {
    speakerSet.add(u.speaker);
  }

  const speakers = Array.from(speakerSet)
    .sort((a, b) => a - b)
    .map((ch) => {
      const label = `SPEAKER_${String(ch).padStart(2, '0')}`;
      return { id: label, label, channel: ch, original_label: label };
    });

  const words = result.words.map((w) => {
    const speakerNum = w.speaker ?? 0;
    const speakerLabel = `SPEAKER_${String(speakerNum).padStart(2, '0')}`;
    return {
      word: w.word,
      punctuated_word: w.punctuated_word ?? w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
      speaker: speakerLabel,
      speaker_channel: speakerNum,
      is_flagged: w.flagged ?? w.confidence < LOW_CONFIDENCE_THRESHOLD,
    };
  });

  const segments = result.utterances.map((u) => {
    const speakerLabel = `SPEAKER_${String(u.speaker).padStart(2, '0')}`;
    return {
      text: u.transcript,
      speaker: speakerLabel,
      start: u.start,
      end: u.end,
      channel: u.speaker,
      original_text: u.transcript,
    };
  });

  const fullTranscript =
    segments.length > 0
      ? segments.map((s) => `${s.speaker}: ${s.text}`).join('\n\n')
      : result.transcript;

  return {
    words,
    segments,
    speakers,
    fullTranscript: fullTranscript || result.transcript,
    rawJson: result.rawResponse,
    confidence: result.confidence,
  };
}

/**
 * Process Deepgram response into our standardized format
 */
function processDeepgramResponse(result: SyncPrerecordedResponse): TranscriptionResult {
  if (!result?.results) {
    throw new Error('Deepgram response missing results payload');
  }

  const channels = result.results.channels;
  if (!channels || !Array.isArray(channels) || channels.length === 0) {
    throw new Error('Deepgram response missing or empty results.channels');
  }

  const channel = channels[0];
  const alternative = channel?.alternatives?.[0];

  if (!alternative) {
    throw new Error('No transcription results returned from Deepgram');
  }

  const rawWords = alternative.words ?? [];
  const words: TranscriptWord[] = rawWords.map((w, i) => {
    const conf = typeof w.confidence === 'number' ? w.confidence : 0;
    return {
      word: w.word ?? '',
      punctuated_word: w.punctuated_word ?? w.word ?? '',
      start: typeof w.start === 'number' ? w.start : 0,
      end: typeof w.end === 'number' ? w.end : 0,
      confidence: conf,
      speaker: w.speaker,
      index: i,
      flagged: conf < LOW_CONFIDENCE_THRESHOLD,
    };
  });

  const utterances: Utterance[] = (result.results?.utterances ?? []).map((utt) => ({
    speaker: utt.speaker ?? 0,
    start: utt.start ?? 0,
    end: utt.end ?? 0,
    transcript: utt.transcript ?? '',
    confidence: utt.confidence ?? 0,
    words: (utt.words ?? []).map((w, i) => {
      const conf = typeof w.confidence === 'number' ? w.confidence : 0;
      return {
        word: w.word ?? '',
        punctuated_word: w.punctuated_word ?? w.word ?? '',
        start: typeof w.start === 'number' ? w.start : 0,
        end: typeof w.end === 'number' ? w.end : 0,
        confidence: conf,
        speaker: w.speaker,
        index: i,
        flagged: conf < LOW_CONFIDENCE_THRESHOLD,
      };
    }),
  }));

  // Flag low-confidence words for scopist review
  const flaggedSegments = extractFlaggedSegments(words);

  // Calculate quality metrics
  const qualityReport = calculateQualityMetrics(words, flaggedSegments);

  return {
    // Full transcript text
    transcript: alternative.transcript || '',

    // Overall confidence
    confidence: alternative.confidence || 0,

    // Word-level data with timestamps
    words,

    // Speaker-segmented utterances
    utterances,

    // Low-confidence segments for scopist review
    flaggedSegments,

    // Quality analysis
    qualityReport,

    // Metadata
    metadata: {
      duration: result.metadata?.duration ?? 0,
      channels: result.metadata?.channels ?? 1,
      modelInfo: result.metadata?.model_info,
      requestId: result.metadata?.request_id,
    },

    // Raw Deepgram response for debugging/storage
    rawResponse: result,
  };
}

/**
 * Extract segments that need scopist review
 */
function extractFlaggedSegments(words: TranscriptWord[]): FlaggedSegment[] {
  const flagged: FlaggedSegment[] = [];
  let currentSegment: FlaggedSegment | null = null;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const isLowConfidence = word.confidence < LOW_CONFIDENCE_THRESHOLD;

    if (isLowConfidence) {
      // Get context (3 words before and after)
      const contextStart = Math.max(0, i - 3);
      const contextEnd = Math.min(words.length, i + 4);
      const contextWords = words.slice(contextStart, contextEnd);
      const contextText = contextWords.map(w => w.word).join(' ');

      if (currentSegment && word.start - currentSegment.end < 1.0) {
        // Extend current segment if words are close together
        currentSegment.end = word.end;
        currentSegment.text = contextText;
        currentSegment.words.push(word);
        // Use lowest confidence in the segment
        currentSegment.confidence = Math.min(currentSegment.confidence, word.confidence);
      } else {
        // Start new segment
        if (currentSegment) {
          flagged.push(currentSegment);
        }
        currentSegment = {
          start: word.start,
          end: word.end,
          text: contextText,
          confidence: word.confidence,
          reason: word.confidence < 0.5 ? 'inaudible' : 'low_confidence',
          words: [word],
          wordIndex: i,
          speaker: word.speaker,
        };
      }
    } else if (currentSegment) {
      // End current segment
      flagged.push(currentSegment);
      currentSegment = null;
    }
  }

  // Don't forget the last segment
  if (currentSegment) {
    flagged.push(currentSegment);
  }

  return flagged;
}

/**
 * Calculate quality metrics for the transcription
 */
function calculateQualityMetrics(
  words: TranscriptWord[],
  flaggedSegments: FlaggedSegment[],
): QualityReport {
  if (words.length === 0) {
    return {
      overallConfidence: 0,
      lowConfidenceCount: 0,
      inaudibleCount: 0,
      qualityScore: 0,
      needsReview: true,
      flaggedSegments,
    };
  }

  // Calculate overall confidence
  const totalConfidence = words.reduce((sum, w) => sum + w.confidence, 0);
  const overallConfidence = totalConfidence / words.length;

  // Count low confidence and inaudible words
  const lowConfidenceCount = words.filter(
    w => w.confidence < LOW_CONFIDENCE_THRESHOLD && w.confidence >= 0.5,
  ).length;

  const inaudibleCount = words.filter(w => w.confidence < 0.5).length;

  // Quality score: 100 = perfect, 0 = all words flagged
  const flaggedWordCount = lowConfidenceCount + inaudibleCount;
  const qualityScore = ((words.length - flaggedWordCount) / words.length) * 100;

  // Needs review if more than 5% of words are flagged or any are inaudible
  const needsReview = (flaggedWordCount / words.length) > 0.05 || inaudibleCount > 0;

  return {
    overallConfidence,
    lowConfidenceCount,
    inaudibleCount,
    qualityScore,
    needsReview,
    flaggedSegments,
  };
}

/**
 * Get formatted transcript with speaker labels (Q/A format for depositions)
 */
export function formatDepositionTranscript(utterances: Utterance[]): string {
  const speakerLabels: Record<number, string> = {};
  let questionerSpeaker: number | null = null;

  // Determine who is asking questions (usually has shorter utterances with "?")
  for (const utt of utterances) {
    if (utt.transcript.includes('?') && !questionerSpeaker) {
      questionerSpeaker = utt.speaker;
      break;
    }
  }

  // Assign labels
  for (const utt of utterances) {
    if (!(utt.speaker in speakerLabels)) {
      if (utt.speaker === questionerSpeaker) {
        speakerLabels[utt.speaker] = 'Q';
      } else if (Object.keys(speakerLabels).length === 0) {
        speakerLabels[utt.speaker] = 'A';
      } else {
        // Additional speakers get numbered
        const count = Object.keys(speakerLabels).length;
        speakerLabels[utt.speaker] = `SPEAKER ${count}`;
      }
    }
  }

  // Format transcript
  const lines: string[] = [];
  for (const utt of utterances) {
    const label = speakerLabels[utt.speaker] || `SPEAKER ${utt.speaker}`;
    lines.push(`${label}: ${utt.transcript}`);
  }

  return lines.join('\n\n');
}

export default {
  transcribeAudio,
  transcribeFromUrl,
  formatDepositionTranscript,
};

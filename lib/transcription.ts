/**
 * Deepgram Transcription Service for Depo-Pro
 *
 * This replaces the mock implementation with real Deepgram API calls.
 * Provides word-level timestamps, confidence scores, and speaker diarization.
 *
 * INSTALLATION: npm install @deepgram/sdk
 */

import type { PrerecordedSchema, SyncPrerecordedResponse } from '@deepgram/sdk';
import { getDeepgramClient, LEGAL_TRANSCRIPTION_OPTIONS, LEGAL_VOCABULARY } from './deepgram/client';
import type {
  TranscriptionResult,
  TranscriptWord,
  Utterance,
  FlaggedSegment,
  QualityReport,
} from '@/types/deepgram';

// Low confidence threshold - words below this are flagged for review
const LOW_CONFIDENCE_THRESHOLD = parseFloat(process.env.LOW_CONFIDENCE_THRESHOLD || '0.85');

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
  const deepgram = getDeepgramClient();

  // For Nova-3: Use keyterm (max 100 terms)
  // For Nova-2: Use keywords (up to 1000 terms)
  const isNova3 = !options.modelPreference || options.modelPreference === 'nova-3';

  // Prioritize custom terms, then add legal vocabulary up to limit
  const customTerms = options.customKeyterms || [];
  const allTerms = [...customTerms, ...LEGAL_VOCABULARY];

  // Build transcription options
  const transcriptionOptions: PrerecordedSchema = {
    ...LEGAL_TRANSCRIPTION_OPTIONS,
    model: options.modelPreference || 'nova-3',
  };

  if (isNova3) {
    // Nova-3: Use keyterm parameter (max 100 terms)
    transcriptionOptions.keyterm = allTerms.slice(0, 100);
  } else {
    // Nova-2: Use keywords parameter (up to 1000 terms)
    transcriptionOptions.keywords = allTerms.slice(0, 1000);
  }

  try {
    // Call Deepgram API
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      transcriptionOptions,
    );

    if (error) {
      console.error('❌ Deepgram API error:', error);
      throw new Error(`Deepgram transcription failed: ${error.message}`);
    }

    // Process the response
    return processDeepgramResponse(result);
  } catch (err) {
    console.error('❌ Transcription error:', err);
    throw err;
  }
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
  const deepgram = getDeepgramClient();

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

  try {
    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: audioUrl },
      transcriptionOptions,
    );

    if (error) {
      throw new Error(`Deepgram transcription failed: ${error.message}`);
    }

    return processDeepgramResponse(result);
  } catch (err) {
    console.error('❌ Transcription error:', err);
    throw err;
  }
}

/**
 * Process Deepgram response into our standardized format
 */
function processDeepgramResponse(result: SyncPrerecordedResponse): TranscriptionResult {
  if (!result?.results) {
    throw new Error('Deepgram response missing results payload');
  }

  const channel = result.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];

  if (!alternative) {
    throw new Error('No transcription results returned from Deepgram');
  }

  // Extract words with our format
  const words: TranscriptWord[] = (alternative.words || []).map((word) => ({
    word: word.word || '',
    start: word.start || 0,
    end: word.end || 0,
    confidence: word.confidence || 0,
    speaker: word.speaker,
    punctuated_word: word.punctuated_word,
  }));

  // Extract utterances (speaker segments)
  const utterances: Utterance[] = (result.results?.utterances || []).map((utt) => ({
    speaker: utt.speaker || 0,
    start: utt.start || 0,
    end: utt.end || 0,
    transcript: utt.transcript || '',
    confidence: utt.confidence || 0,
    words: (utt.words || []).map((w) => ({
      word: w.word || '',
      start: w.start || 0,
      end: w.end || 0,
      confidence: w.confidence || 0,
      speaker: w.speaker,
    })),
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
      duration: result.metadata?.duration || 0,
      channels: result.metadata?.channels || 1,
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

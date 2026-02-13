// lib/services/correction-logger.ts
// Accuracy Intelligence Plan - Step 2: Correction Logging Service
// Logs every correction/confirmation/skip to enable vocabulary learning and pattern analysis

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { categorizeWord } from '@/lib/services/confidence-analytics';

export interface CorrectionInput {
  transcriptionId: string;
  jobId: string;
  firmId: string;
  reviewerId: string;
  wordIndex: number;
  originalWord: string;
  correctedWord?: string; // undefined if confirmed or skipped
  action: 'CORRECTED' | 'CONFIRMED' | 'SKIPPED';
  confidence: number;
  speakerLabel?: string;
  audioPosition?: number;
  contextBefore?: string;
  contextAfter?: string;
}

/**
 * Log a single correction to the corrections table
 *
 * CRITICAL: This must never throw errors that break the review workflow.
 * If logging fails, log the error but continue.
 */
export async function logCorrection(input: CorrectionInput): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();

    await supabase.from('transcription_corrections').insert({
      transcription_id: input.transcriptionId,
      job_id: input.jobId,
      firm_id: input.firmId,
      reviewer_id: input.reviewerId,
      word_index: input.wordIndex,
      original_word: input.originalWord,
      corrected_word: input.correctedWord || null,
      action: input.action,
      confidence_at_time: input.confidence,
      category: categorizeWord(input.originalWord),
      speaker_label: input.speakerLabel || null,
      audio_position_seconds: input.audioPosition || null,
      context_before: input.contextBefore || null,
      context_after: input.contextAfter || null,
    });
  } catch (error) {
    // Never break the review workflow if logging fails
    console.error('[correction-logger] Failed to log correction:', error, {
      word: input.originalWord,
      action: input.action,
    });
  }
}

/**
 * Log multiple corrections in a single batch
 * Used when submitting a completed review session
 */
export async function logCorrectionsBatch(
  corrections: CorrectionInput[]
): Promise<void> {
  if (corrections.length === 0) return;

  try {
    const supabase = await createSupabaseServerClient();

    const rows = corrections.map(c => ({
      transcription_id: c.transcriptionId,
      job_id: c.jobId,
      firm_id: c.firmId,
      reviewer_id: c.reviewerId,
      word_index: c.wordIndex,
      original_word: c.originalWord,
      corrected_word: c.correctedWord || null,
      action: c.action,
      confidence_at_time: c.confidence,
      category: categorizeWord(c.originalWord),
      speaker_label: c.speakerLabel || null,
      audio_position_seconds: c.audioPosition || null,
      context_before: c.contextBefore || null,
      context_after: c.contextAfter || null,
    }));

    await supabase.from('transcription_corrections').insert(rows);
  } catch (error) {
    console.error('[correction-logger] Batch logging failed:', error);
  }
}

/**
 * Helper to extract context words around a given word index
 */
export function getWordContext(
  allWords: Array<{ word: string; punctuated_word?: string }>,
  wordIndex: number,
  direction: number // -3 for before, +3 for after
): string {
  const contextWords: string[] = [];
  const start = direction < 0 ? Math.max(0, wordIndex + direction) : wordIndex + 1;
  const end = direction < 0 ? wordIndex : Math.min(allWords.length, wordIndex + direction + 1);

  for (let i = start; i < end; i++) {
    const w = allWords[i];
    contextWords.push(w.punctuated_word || w.word);
  }

  return contextWords.join(' ');
}

/**
 * Flagged Words Query Layer for Depo-Pro v1.3
 *
 * Handles low-confidence words that require scopist review
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { FlaggedWordStatus } from '@/types/schema-enums';
import type { FlaggedWordStats } from '@/types/transcription';

/**
 * Get paginated flagged words for a transcription
 * Supports filtering by status and sorting
 */
export async function getFlaggedWords(
  transcriptionId: string,
  options?: {
    status?: FlaggedWordStatus;
    limit?: number;
    offset?: number;
    sort?: 'sort_order' | 'confidence' | 'created_at';
    order?: 'asc' | 'desc';
  }
) {
  const supabase = await createClient();

  let query = supabase
    .from('flagged_words')
    .select('*', { count: 'exact' })
    .eq('transcription_id', transcriptionId);

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const sortColumn = options?.sort || 'sort_order';
  const sortOrder = options?.order || 'asc';
  query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 50) - 1
    );
  }

  return await query;
}

/**
 * Get a single flagged word by ID
 */
export async function getFlaggedWordById(wordId: string) {
  const supabase = await createClient();

  return await supabase
    .from('flagged_words')
    .select('*')
    .eq('id', wordId)
    .single();
}

/**
 * Get flagged word statistics for a transcription
 */
export async function getFlaggedWordStats(
  transcriptionId: string
): Promise<{ data: FlaggedWordStats | null; error: any }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('flagged_words')
    .select('status')
    .eq('transcription_id', transcriptionId);

  if (error) return { data: null, error };

  const stats: FlaggedWordStats = {
    total: data?.length || 0,
    pending: 0,
    corrected: 0,
    confirmed: 0,
    skipped: 0,
  };

  data?.forEach((word: any) => {
    const status = word.status as FlaggedWordStatus;
    if (status === FlaggedWordStatus.PENDING) stats.pending++;
    else if (status === FlaggedWordStatus.CORRECTED) stats.corrected++;
    else if (status === FlaggedWordStatus.CONFIRMED) stats.confirmed++;
    else if (status === FlaggedWordStatus.SKIPPED) stats.skipped++;
  });

  return { data: stats, error: null };
}

/**
 * Update flagged word (correction, confirmation, skip)
 */
export async function updateFlaggedWord(
  wordId: string,
  updates: {
    corrected_word?: string | null;
    status?: FlaggedWordStatus;
    reviewed_by?: string;
    review_notes?: string | null;
  }
) {
  const supabase = await createClient();

  return await supabase
    .from('flagged_words')
    .update({
      ...updates,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', wordId)
    .select()
    .single();
}

/**
 * Correct a flagged word
 * Sets status to CORRECTED and records the correction
 */
export async function correctFlaggedWord(
  wordId: string,
  correctedWord: string,
  userId: string,
  notes?: string
) {
  return updateFlaggedWord(wordId, {
    corrected_word: correctedWord,
    status: FlaggedWordStatus.CORRECTED,
    reviewed_by: userId,
    review_notes: notes,
  });
}

/**
 * Confirm original word is correct
 * Sets status to CONFIRMED (no correction needed)
 */
export async function confirmFlaggedWord(
  wordId: string,
  userId: string,
  notes?: string
) {
  return updateFlaggedWord(wordId, {
    corrected_word: null,
    status: FlaggedWordStatus.CONFIRMED,
    reviewed_by: userId,
    review_notes: notes,
  });
}

/**
 * Skip flagged word review
 * Sets status to SKIPPED (will not be reviewed)
 */
export async function skipFlaggedWord(
  wordId: string,
  userId: string,
  notes?: string
) {
  return updateFlaggedWord(wordId, {
    status: FlaggedWordStatus.SKIPPED,
    reviewed_by: userId,
    review_notes: notes,
  });
}

/**
 * Bulk update multiple flagged words
 * Used for batch operations
 */
export async function bulkUpdateFlaggedWords(
  updates: Array<{
    id: string;
    corrected_word?: string | null;
    status?: FlaggedWordStatus;
    reviewed_by?: string;
    review_notes?: string | null;
  }>
) {
  const supabase = await createClient();

  const promises = updates.map((update) =>
    updateFlaggedWord(update.id, update)
  );

  return await Promise.allSettled(promises);
}

/**
 * Get next pending flagged word for review
 * Returns the next word in sort_order that is PENDING
 */
export async function getNextPendingWord(transcriptionId: string) {
  const supabase = await createClient();

  return await supabase
    .from('flagged_words')
    .select('*')
    .eq('transcription_id', transcriptionId)
    .eq('status', FlaggedWordStatus.PENDING)
    .order('sort_order', { ascending: true })
    .limit(1)
    .single();
}

/**
 * Extract flagged words using RPC
 * This is called after transcription completes
 * Uses set-based SQL for performance (C-4 fix)
 */
export async function extractFlaggedWords(
  transcriptionId: string,
  confidenceThreshold: number = 0.7
) {
  const _supabase = await createAdminClient();

  return await _supabase.rpc('extract_flagged_words', {
    p_transcription_id: transcriptionId,
    p_confidence_threshold: confidenceThreshold,
  });
}

/**
 * Re-extract flagged words (after transcription edit)
 * Preserves already-reviewed words (C-4 verification requirement)
 */
export async function reExtractFlaggedWords(
  transcriptionId: string,
  confidenceThreshold: number = 0.7
) {
  const _supabase = await createAdminClient();

  return await _supabase.rpc('extract_flagged_words', {
    p_transcription_id: transcriptionId,
    p_confidence_threshold: confidenceThreshold,
  });
}

/**
 * Get flagged words with context for export
 * Useful for generating review reports
 */
export async function getFlaggedWordsForExport(transcriptionId: string) {
  const supabase = await createClient();

  return await supabase
    .from('flagged_words')
    .select(`
      id,
      word_index,
      segment_index,
      original_word,
      corrected_word,
      confidence,
      start_time,
      end_time,
      speaker,
      context_before,
      context_after,
      status,
      reviewed_by,
      reviewed_at,
      review_notes
    `)
    .eq('transcription_id', transcriptionId)
    .order('sort_order', { ascending: true });
}

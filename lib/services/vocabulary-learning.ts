// lib/services/vocabulary-learning.ts
// Accuracy Intelligence Plan - Step 7: Cross-Transcript Vocabulary Learning
// AUTO-MOAT: Accuracy compounds over time as corrections teach the system

import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface VocabularyPromotion {
  word: string;
  correctionCount: number;
  firstSeen: string;
  lastSeen: string;
  promoted: boolean;
}

/**
 * Check for words that should be auto-promoted to firm vocabulary
 *
 * COMPOUNDING INTELLIGENCE LOOP:
 * 1. Firm corrects "radiculopathy" 3 times across different transcripts
 * 2. System auto-adds to firm vocabulary boost
 * 3. 4th transcript gets it right automatically
 * 4. Accuracy improves without manual vocabulary management
 *
 * @param firmId - Firm ID to check
 * @param promotionThreshold - Number of corrections before auto-promotion (default: 3)
 * @returns Promoted words and candidates
 */
export async function checkAutoPromotions(
  firmId: string,
  promotionThreshold: number = 3
): Promise<{
  promoted: string[];
  candidates: Array<{
    word: string;
    count: number;
    threshold: number;
  }>;
}> {
  const supabase = await createSupabaseServerClient();

  // Find words corrected multiple times by this firm
  const { data: frequent, error } = await supabase
    .from('transcription_corrections')
    .select('original_word, corrected_word, created_at')
    .eq('firm_id', firmId)
    .eq('action', 'CORRECTED')
    .not('corrected_word', 'is', null);

  if (error || !frequent) {
    console.error('[vocabulary-learning] Query failed:', error);
    return { promoted: [], candidates: [] };
  }

  // Count correction frequency per original -> corrected pair
  const pairCounts: Record<
    string,
    { corrected: string; count: number; firstSeen: string; lastSeen: string }
  > = {};

  for (const row of frequent) {
    const key = `${row.original_word.toLowerCase()}->${row.corrected_word.toLowerCase()}`;

    if (!pairCounts[key]) {
      pairCounts[key] = {
        corrected: row.corrected_word,
        count: 0,
        firstSeen: row.created_at,
        lastSeen: row.created_at,
      };
    }

    pairCounts[key].count += 1;

    // Track first/last seen
    if (row.created_at < pairCounts[key].firstSeen) {
      pairCounts[key].firstSeen = row.created_at;
    }
    if (row.created_at > pairCounts[key].lastSeen) {
      pairCounts[key].lastSeen = row.created_at;
    }
  }

  const promoted: string[] = [];
  const candidates: Array<{ word: string; count: number; threshold: number }> =
    [];

  for (const [_key, { corrected, count, firstSeen, lastSeen }] of Object.entries(
    pairCounts
  )) {
    if (count >= promotionThreshold) {
      // Check if already in vocabulary
      const { data: existing } = await supabase
        .from('custom_vocabularies')
        .select('id')
        .eq('firm_id', firmId)
        .eq('term', corrected)
        .maybeSingle();

      if (!existing) {
        // Auto-add to firm vocabulary
        const { error: insertError } = await supabase
          .from('custom_vocabularies')
          .insert({
            firm_id: firmId,
            term: corrected,
            source: 'auto_learned',
            correction_count: count,
            first_seen: firstSeen,
            last_seen: lastSeen,
            created_at: new Date().toISOString(),
          });

        if (!insertError) {
          promoted.push(corrected);
        } else {
          console.error('[vocabulary-learning] Insert failed:', insertError);
        }
      }
    } else if (count >= Math.floor(promotionThreshold / 2)) {
      // Candidate: halfway to promotion threshold
      candidates.push({
        word: corrected,
        count,
        threshold: promotionThreshold,
      });
    }
  }

  return { promoted, candidates };
}

/**
 * Get frequently corrected words for a firm (analytics)
 *
 * @param firmId - Firm ID
 * @param limit - Max results to return
 * @returns Top corrected words with counts
 */
export async function getFrequentCorrections(
  firmId: string,
  limit: number = 20
): Promise<
  Array<{
    originalWord: string;
    correctedWord: string;
    count: number;
    inVocabulary: boolean;
  }>
> {
  const supabase = await createSupabaseServerClient();

  // Get correction frequency
  const { data: corrections } = await supabase
    .from('transcription_corrections')
    .select('original_word, corrected_word')
    .eq('firm_id', firmId)
    .eq('action', 'CORRECTED')
    .not('corrected_word', 'is', null);

  if (!corrections) return [];

  // Count frequency
  const counts: Record<
    string,
    { originalWord: string; correctedWord: string; count: number }
  > = {};

  for (const c of corrections) {
    const key = `${c.original_word}->${c.corrected_word}`;
    if (!counts[key]) {
      counts[key] = {
        originalWord: c.original_word,
        correctedWord: c.corrected_word,
        count: 0,
      };
    }
    counts[key].count += 1;
  }

  // Sort by frequency
  const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, limit);

  // Check which are in vocabulary
  const { data: vocabTerms } = await supabase
    .from('custom_vocabularies')
    .select('term')
    .eq('firm_id', firmId);

  const vocabSet = new Set(vocabTerms?.map(v => v.term.toLowerCase()) || []);

  return top.map(c => ({
    ...c,
    inVocabulary: vocabSet.has(c.correctedWord.toLowerCase()),
  }));
}

/**
 * Get vocabulary learning statistics for a firm
 */
export async function getVocabularyLearningStats(firmId: string): Promise<{
  totalCorrections: number;
  uniqueWords: number;
  autoPromoted: number;
  candidates: number;
  accuracyGain: number; // estimated % gain from vocabulary
}> {
  const supabase = await createSupabaseServerClient();

  // Total corrections
  const { count: totalCorrections } = await supabase
    .from('transcription_corrections')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', firmId)
    .eq('action', 'CORRECTED');

  // Unique corrected words
  const { data: unique } = await supabase
    .from('transcription_corrections')
    .select('corrected_word')
    .eq('firm_id', firmId)
    .eq('action', 'CORRECTED')
    .not('corrected_word', 'is', null);

  const uniqueWords = new Set(unique?.map(u => u.corrected_word.toLowerCase()))
    .size;

  // Auto-promoted vocabulary
  const { count: autoPromoted } = await supabase
    .from('custom_vocabularies')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', firmId)
    .eq('source', 'auto_learned');

  // Run auto-promotion check to get candidates
  const { candidates } = await checkAutoPromotions(firmId);

  // Estimate accuracy gain
  // Assumption: Each promoted word prevents ~2 future errors per transcript
  // If firm does 10 transcripts/month with avg 5000 words each
  // accuracyGain = (autoPromoted * 2) / 5000 * 100
  const estimatedGain =
    autoPromoted && autoPromoted > 0
      ? Math.round(((autoPromoted * 2) / 5000) * 1000) / 10
      : 0;

  return {
    totalCorrections: totalCorrections || 0,
    uniqueWords,
    autoPromoted: autoPromoted || 0,
    candidates: candidates.length,
    accuracyGain: estimatedGain,
  };
}

/**
 * Format vocabulary learning stats for display
 */
export function formatVocabularyStats(stats: {
  totalCorrections: number;
  uniqueWords: number;
  autoPromoted: number;
  candidates: number;
  accuracyGain: number;
}): string {
  if (stats.autoPromoted === 0) {
    return `${stats.totalCorrections} corrections made. ${stats.candidates} words are candidates for vocabulary boost.`;
  }

  return `${stats.autoPromoted} words auto-promoted to vocabulary. Estimated +${stats.accuracyGain}% accuracy gain on future transcripts.`;
}

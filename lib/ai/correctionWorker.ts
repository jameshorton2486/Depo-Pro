// lib/ai/correctionWorker.ts
// AI-assisted correction pipeline using Anthropic API.
// Suggestions are NEVER auto-applied — always require human action.

import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

const BATCH_SIZE = 20;
const MODEL = 'claude-sonnet-4-6';

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  return new Anthropic({ apiKey });
}

interface FlaggedWordForAI {
  id: string;
  original_word: string;
  confidence: number;
  context_before: string;
  context_after: string;
  word_index: number;
}

/**
 * Run AI correction on all flagged (PENDING) words for a transcript.
 * Results are stored in ai_suggestions table with applied=false.
 */
export async function runAICorrection(transcriptId: string): Promise<void> {
  const supabase = createAdminClient();
  const anthropic = getClient();

  // 1. Fetch all pending flagged words
  const { data: flaggedWords, error: fetchError } = await supabase
    .from('flagged_words')
    .select('id, original_word, confidence, context_before, context_after, word_index')
    .eq('transcription_id', transcriptId)
    .eq('status', 'PENDING')
    .order('word_index', { ascending: true });

  if (fetchError) {
    logger.error('[ai-correction] Failed to fetch flagged words', fetchError, { transcriptId });
    throw new Error(`Failed to fetch flagged words: ${fetchError.message}`);
  }

  if (!flaggedWords || flaggedWords.length === 0) {
    logger.info('[ai-correction] No pending flagged words', { transcriptId });
    return;
  }

  logger.info('[ai-correction] Starting AI review', {
    transcriptId,
    wordCount: flaggedWords.length,
  });

  // 2. Process in batches
  for (let i = 0; i < flaggedWords.length; i += BATCH_SIZE) {
    const batch = flaggedWords.slice(i, i + BATCH_SIZE) as FlaggedWordForAI[];
    await processBatch(supabase, anthropic, transcriptId, batch);
  }

  logger.info('[ai-correction] AI review complete', { transcriptId });
}

async function processBatch(
  supabase: ReturnType<typeof createAdminClient>,
  anthropic: Anthropic,
  transcriptId: string,
  batch: FlaggedWordForAI[],
): Promise<void> {
  for (const word of batch) {
    try {
      const prompt = `You are a legal transcript editor. The following word was flagged as low confidence in a deposition transcript.

Context: ${word.context_before} [${word.original_word}] ${word.context_after}

The deposition is a legal proceeding. Speakers are attorneys and witnesses.
If the flagged word is likely incorrect, suggest the correct legal term.
If it appears correct, respond with the same word.
Respond with ONLY the suggested word and a one-sentence reason.
Format: WORD | REASON`;

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      });

      // Parse response
      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')
        .trim();

      const parts = text.split('|').map((s) => s.trim());
      const suggestedWord = parts[0] || word.original_word;
      const reasoning = parts[1] || 'No reasoning provided';

      // 5. Skip if suggestion matches original (no change needed)
      if (suggestedWord.toLowerCase() === word.original_word.toLowerCase()) {
        continue;
      }

      // 4. Insert into ai_suggestions
      const { error: insertError } = await supabase.from('ai_suggestions').insert({
        transcription_id: transcriptId,
        word_id: word.id,
        word_index: word.word_index,
        original_word: word.original_word,
        suggested_word: suggestedWord,
        confidence: 0.85,
        model: MODEL,
        reasoning,
        applied: false,
        dismissed: false,
      });

      if (insertError) {
        logger.warn('[ai-correction] Failed to insert suggestion', {
          wordId: word.id,
          error: insertError.message,
        });
      }
    } catch (error) {
      logger.error(
        '[ai-correction] Failed to process word',
        error instanceof Error ? error : new Error(String(error)),
        { wordId: word.id, transcriptId },
      );
      // Continue with next word — don't let one failure block the batch
    }
  }
}

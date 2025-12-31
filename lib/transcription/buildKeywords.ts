import { db } from '@/lib/db';
import { DepositionNoteType } from '@prisma/client';

/**
 * Keyword configuration for Deepgram
 */
interface KeywordConfig {
  word: string;
  boost?: number;
}

/**
 * Get proper noun keywords from reporter notes for Deepgram
 * 
 * Rules:
 * - No duplicates (case-insensitive)
 * - Trim whitespace
 * - Skip empty strings
 * - Default boost: 15 (high priority for proper nouns)
 * - Max 1000 keywords (Deepgram limit for Nova-2; Nova-3 uses keyterm with max 100)
 */
export async function getProperNounKeywords(jobId: string): Promise<string[]> {
  const keywordConfigs = await buildKeywordsForJob(jobId);
  return keywordConfigs.map(k => k.word);
}

/**
 * Build keyword configurations from proper nouns
 */
export async function buildKeywordsForJob(jobId: string): Promise<KeywordConfig[]> {
  // Fetch proper nouns for this job
  const notes = await db.depositionNote.findMany({
    where: {
      jobId,
      type: DepositionNoteType.PROPER_NOUN,
    },
    select: { content: true },
    orderBy: { createdAt: 'asc' },
  });

  if (notes.length === 0) {
    return [];
  }

  // Process keywords
  const seen = new Set<string>();
  const keywords: KeywordConfig[] = [];

  for (const note of notes) {
    // Skip empty content
    if (!note.content?.trim()) continue;

    // Normalize: trim and lowercase for deduplication
    const normalized = note.content.trim().toLowerCase();

    // Skip duplicates
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    // Add with original casing (trimmed)
    keywords.push({
      word: note.content.trim(),
      boost: 15, // High priority for proper nouns
    });
  }

  // Respect Deepgram limit (Nova-2 allows 1000; Nova-3 keyterm allows 100)
  const MAX_KEYWORDS = 1000;
  if (keywords.length > MAX_KEYWORDS) {
    console.warn(`[Keywords] Truncating keywords from ${keywords.length} to ${MAX_KEYWORDS} for job ${jobId}`);
    return keywords.slice(0, MAX_KEYWORDS);
  }

  return keywords;
}

/**
 * Format keywords for Deepgram API
 * Nova-3 uses keyterm (array of strings, max 100)
 * Nova-2 uses keywords (array of strings or "word:boost" format, max 1000)
 */
export function formatKeywordsForDeepgram(keywords: KeywordConfig[], model: 'nova-3' | 'nova-2' | 'nova-2-medical' = 'nova-3'): string[] {
  const isNova3 = model === 'nova-3';
  
  // For Nova-3: Just return word strings (keyterm parameter)
  // For Nova-2: Can use "word:boost" format or just strings
  if (isNova3) {
    return keywords.map(k => k.word);
  } else {
    // Nova-2: Use "word:boost" format if boost is provided
    return keywords.map(k => 
      k.boost ? `${k.word}:${k.boost}` : k.word
    );
  }
}

/**
 * Build Deepgram config with keywords
 */
export async function buildDeepgramConfigWithKeywords(
  jobId: string,
  baseConfig: Record<string, any> = {},
  model: 'nova-3' | 'nova-2' | 'nova-2-medical' = 'nova-3'
): Promise<Record<string, any>> {
  const keywordConfigs = await buildKeywordsForJob(jobId);
  const formattedKeywords = formatKeywordsForDeepgram(keywordConfigs, model);

  const isNova3 = model === 'nova-3';
  
  return {
    ...baseConfig,
    [isNova3 ? 'keyterm' : 'keywords']: formattedKeywords,
  };
}

/**
 * Get all keywords including CSRProperNoun entries
 */
export async function getAllKeywordsForJob(jobId: string): Promise<string[]> {
  const noteKeywords = await getProperNounKeywords(jobId);

  const csrRecord = await db.cSRRecord.findUnique({
    where: { jobId },
    include: {
      properNouns: { select: { value: true } },
    },
  });

  const csrKeywords = csrRecord?.properNouns?.map(pn => pn.value) || [];

  // Deduplicate (case-insensitive)
  const seen = new Set<string>();
  const allKeywords: string[] = [];
  
  for (const keyword of [...noteKeywords, ...csrKeywords]) {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    allKeywords.push(keyword.trim());
  }

  return allKeywords;
}

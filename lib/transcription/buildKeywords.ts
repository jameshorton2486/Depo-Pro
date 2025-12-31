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
 * Build keyword configurations from all sources:
 * 1. DepositionNote (PROPER_NOUN type)
 * 2. CSRProperNoun (live-captured during deposition)
 * 3. CaseExtractedTerm (extracted from uploaded documents)
 */
export async function buildKeywordsForJob(jobId: string): Promise<KeywordConfig[]> {
  // 1. Fetch proper nouns from DepositionNote
  const notes = await db.depositionNote.findMany({
    where: {
      jobId,
      type: DepositionNoteType.PROPER_NOUN,
    },
    select: { content: true },
    orderBy: { createdAt: 'asc' },
  });

  // 2. Fetch CSRProperNouns (live capture)
  const csrRecord = await db.cSRRecord.findUnique({
    where: { jobId },
    include: {
      properNouns: {
        where: { useInTranscription: true },
        select: { value: true, priority: true },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      },
    },
  });

  // 3. Fetch CaseExtractedTerms (from uploaded documents)
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { caseId: true },
  });

  let caseExtractedTerms: Array<{ term: string }> = [];
  if (job?.caseId) {
    const extractedTerms = await db.caseExtractedTerm.findMany({
      where: {
        caseId: job.caseId,
        useInTranscription: true,
      },
      select: { term: true },
      orderBy: { createdAt: 'asc' },
    });
    caseExtractedTerms = extractedTerms;
  }

  // Combine all sources
  const allTerms: Array<{ word: string; priority?: number }> = [];

  // Add DepositionNote terms
  for (const note of notes) {
    if (note.content?.trim()) {
      allTerms.push({ word: note.content.trim() });
    }
  }

  // Add CSRProperNoun terms (higher priority)
  for (const noun of csrRecord?.properNouns || []) {
    if (noun.value?.trim()) {
      allTerms.push({ word: noun.value.trim(), priority: noun.priority });
    }
  }

  // Add CaseExtractedTerm terms
  for (const term of caseExtractedTerms) {
    if (term.term?.trim()) {
      allTerms.push({ word: term.term.trim() });
    }
  }

  if (allTerms.length === 0) {
    return [];
  }

  // Process keywords with deduplication
  const seen = new Set<string>();
  const keywords: KeywordConfig[] = [];

  // Sort by priority (higher first), then by creation order
  const sortedTerms = allTerms.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const term of sortedTerms) {
    // Normalize: trim and lowercase for deduplication
    const normalized = term.word.trim().toLowerCase();

    // Skip duplicates
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    // Calculate boost: 15 base + priority (if present)
    const boost = 15 + (term.priority || 0);

    // Add with original casing (trimmed)
    keywords.push({
      word: term.word.trim(),
      boost: Math.min(boost, 100), // Cap boost at 100
    });
  }

  // Respect Deepgram limit (Nova-2 allows 1000; Nova-3 keyterm allows 100)
  // Prioritize higher-priority terms
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

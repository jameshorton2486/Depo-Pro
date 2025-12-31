import { db } from '@/lib/db';
import { DepositionNoteType } from '@prisma/client';

/**
 * Get proper noun keywords from reporter notes for Deepgram
 */
export async function getProperNounKeywords(jobId: string): Promise<string[]> {
  const notes = await db.depositionNote.findMany({
    where: {
      jobId,
      type: DepositionNoteType.PROPER_NOUN,
    },
    select: { content: true },
    orderBy: { createdAt: 'asc' },
  });

  return notes
    .map(n => n.content)
    .join('\n')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.replace(/\s*\([^)]*\)\s*/g, '').trim())
    .filter(Boolean)
    .filter((value, index, self) => self.indexOf(value) === index);
}

/**
 * Build Deepgram config with keywords
 */
export async function buildDeepgramConfigWithKeywords(
  jobId: string,
  baseConfig: Record<string, any> = {}
): Promise<Record<string, any>> {
  const keywords = await getProperNounKeywords(jobId);

  const keywordConfig = keywords.map(keyword => ({
    keyword,
    boost: 2.0,
  }));

  return {
    ...baseConfig,
    keywords: keywordConfig,
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

  return [...new Set([...noteKeywords, ...csrKeywords])];
}

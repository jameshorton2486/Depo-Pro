import { logger } from '@/lib/logger';
// lib/transcription/buildKeywords.ts
// STUB: Build keywords for transcription
//
// Production guard: This service is stubbed and will throw in production
// to prevent returning empty keyword lists that could affect transcription quality.

export interface KeywordConfig {
  word: string;
  boost?: number;
}

export async function buildKeywordsForJob(_jobId: string): Promise<KeywordConfig[]> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[BuildKeywords] buildKeywordsForJob is not implemented. ' +
      'This is a stubbed service - implement real keyword extraction before production deployment. ' +
      'Empty keyword lists can reduce transcription accuracy.'
    );
  }
  logger.debug('[STUB] buildKeywordsForJob called');
  // In real implementation, fetch proper nouns and custom dictionary
  return [];
}

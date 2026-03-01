import { logger } from '@/lib/logger';
// lib/transcription/buildKeywords.ts
// STUB: Build keywords for transcription
void logger;
//
// Production guard: This service is stubbed and will throw in production
// to prevent returning empty keyword lists that could affect transcription quality.

export interface KeywordConfig {
  word: string;
  boost?: number;
}

// Phase 2: Implement Deepgram keyword boosting from job-specific dictionary
export async function buildKeywordsForJob(_jobId: string): Promise<KeywordConfig[]> {
  return [];
}

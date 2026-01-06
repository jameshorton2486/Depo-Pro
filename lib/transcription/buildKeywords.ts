// lib/transcription/buildKeywords.ts
// STUB: Build keywords for transcription

export interface KeywordConfig {
  word: string;
  boost?: number;
}

export async function buildKeywordsForJob(_jobId: string): Promise<KeywordConfig[]> {
  console.log('[STUB] buildKeywordsForJob called');
  // In real implementation, fetch proper nouns and custom dictionary
  return [];
}

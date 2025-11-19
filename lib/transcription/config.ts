/**
 * Deepgram Transcription Configuration
 * Optimized settings for legal transcription
 */

import type { DeepgramConfig } from '@/types/deepgram';

interface ConfigOptions {
  firmId: string;
  customDictionary?: string[];
  modelPreference?: 'general' | 'medical';
}

/**
 * Get optimal Deepgram configuration for legal transcription
 * TODO: Implement configuration logic
 */
export function getOptimalDeepgramConfig(options: ConfigOptions): DeepgramConfig {
  const { customDictionary = [], modelPreference = 'general' } = options;
  
  // TODO: Return proper Deepgram configuration with:
  // - diarize: true (speaker identification)
  // - utterances: true (segment by speaker)
  // - punctuate: true
  // - smart_format: true
  // - filler_words: true (capture "um", "uh", etc.)
  // - profanity_filter: false (legal accuracy)
  // - alternatives: 3 (for uncertain words)
  // - keywords: customDictionary (boost legal terms)
  
  console.log('TODO: Implement getOptimalDeepgramConfig()');
  
  return {
    model: 'nova-2-general',
    diarize: true,
    utterances: true,
    punctuate: true,
    smart_format: true,
    filler_words: true,
    profanity_filter: false,
    alternatives: 3,
    keywords: customDictionary,
  };
}

export default { getOptimalDeepgramConfig };

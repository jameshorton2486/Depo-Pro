/**
 * Deepgram Transcription Configuration
 * Optimized settings for legal transcription
 */

import type { DeepgramConfig } from '@/types/deepgram';

interface ConfigOptions {
  customDictionary?: string[];
  modelPreference?: 'general' | 'medical';
}

/**
 * Get optimal Deepgram configuration for legal transcription
 * TODO: Implement configuration logic
 */
export function getOptimalDeepgramConfig(options: ConfigOptions): DeepgramConfig {
  const { customDictionary = [], modelPreference = 'general' } = options;
  
  return {
    model: modelPreference === 'medical' ? 'nova-2-medical' : 'nova-2',
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

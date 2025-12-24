/**
 * Deepgram Transcription Configuration
 * Optimized settings for legal transcription
 *
 * IMPORTANT NOTES:
 * - Nova-3: Use `keyterm` (max 100 terms) - `keywords` is NOT supported
 * - Nova-2: Use `keywords` (up to 1000 terms with intensifiers)
 * - smart_format: Automatically formats dates, times, and numbers
 * - dictation: Converts spoken "period" to "." (disable for verbatim legal)
 */

import type { PrerecordedSchema } from '@deepgram/sdk';
import { LEGAL_VOCABULARY } from '@/lib/deepgram/client';

export interface ConfigOptions {
  firmId?: string;
  customKeyterms?: string[];
  modelPreference?: 'nova-3' | 'nova-2' | 'nova-2-medical';
  includeFillerWords?: boolean;
  enableParagraphs?: boolean;
  enableDictation?: boolean;
}

/**
 * Get optimal Deepgram configuration for legal transcription
 */
export function getOptimalDeepgramConfig(options: ConfigOptions = {}): PrerecordedSchema {
  const {
    customKeyterms = [],
    modelPreference = 'nova-3',
    includeFillerWords = true,
    enableParagraphs = true,
    enableDictation = false,  // False for verbatim legal transcription
  } = options;

  // Combine custom terms with legal vocabulary
  const allTerms = [...customKeyterms, ...LEGAL_VOCABULARY];

  const isNova3 = modelPreference === 'nova-3';

  const config: PrerecordedSchema = {
    // Model Selection
    model: modelPreference,

    // Speaker Identification (essential for depositions)
    diarize: true,

    // Segment by speaker turns
    utterances: true,

    // Formatting
    punctuate: true,
    smart_format: true,       // Formats dates, times, numbers
    paragraphs: enableParagraphs,
    dictation: enableDictation, // Convert spoken punctuation to symbols

    // Verbatim accuracy for legal
    filler_words: includeFillerWords,  // Keep "um", "uh"
    profanity_filter: false,           // No filtering for accuracy

    // Language
    language: 'en-US',
    detect_language: false,

    // Number formatting
    numerals: true,           // Convert numbers to digits
  };

  // Add term boosting based on model
  if (isNova3) {
    // Nova-3: Use keyterm (max 100 terms)
    // @ts-expect-error - keyterm may not be in SDK types yet
    config.keyterm = allTerms.slice(0, 100);
  } else {
    // Nova-2: Use keywords with optional intensifiers
    config.keywords = allTerms.slice(0, 1000);
  }

  return config;
}

/**
 * Configuration presets for different use cases
 */
export const CONFIG_PRESETS = {
  deposition: {
    model: 'nova-3' as const,
    diarize: true,
    utterances: true,
    filler_words: true,
    profanity_filter: false,
  },

  hearing: {
    model: 'nova-3' as const,
    diarize: true,
    utterances: true,
    filler_words: true,
    profanity_filter: false,
  },

  medical: {
    model: 'nova-2-medical' as const,
    diarize: true,
    utterances: true,
    filler_words: false,
    profanity_filter: false,
  },

  quick: {
    model: 'nova-2' as const,
    diarize: false,
    utterances: false,
    filler_words: false,
    profanity_filter: false,
  },
};

/**
 * Get configuration for a specific preset
 */
export function getPresetConfig(
  preset: keyof typeof CONFIG_PRESETS,
  customOptions?: Partial<ConfigOptions>,
): PrerecordedSchema {
  const presetConfig = CONFIG_PRESETS[preset];
  return getOptimalDeepgramConfig({
    modelPreference: presetConfig.model,
    includeFillerWords: presetConfig.filler_words,
    ...customOptions,
  });
}

export default {
  getOptimalDeepgramConfig,
  getPresetConfig,
  CONFIG_PRESETS,
};

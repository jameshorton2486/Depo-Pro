/**
 * Deepgram Client for Depo-Pro
 * Real implementation using @deepgram/sdk
 *
 * INSTALLATION: npm install @deepgram/sdk
 */

import type { DeepgramClient, PrerecordedSchema } from '@deepgram/sdk';
import { createClient } from '@deepgram/sdk';
import { requireEnv } from '@/lib/env';

// Singleton Deepgram client
let deepgramClient: DeepgramClient | null = null;

/**
 * Get or create the Deepgram client instance
 */
export function getDeepgramClient(): DeepgramClient {
  if (!deepgramClient) {
    const DEEPGRAM_API_KEY = requireEnv('DEEPGRAM_API_KEY');
    deepgramClient = createClient(DEEPGRAM_API_KEY);
  }

  return deepgramClient;
}

/**
 * Legal-optimized transcription options for depositions
 *
 * NOTE: For Nova-3, use `keyterm` instead of `keywords` (keywords not supported)
 * - keyterm: Up to 100 terms per request for boosting recognition
 * - smart_format: Formats dates, times, and numbers automatically
 * - dictation: Converts spoken punctuation ("period", "comma") to symbols
 */
export const LEGAL_TRANSCRIPTION_OPTIONS: PrerecordedSchema = {
  // Model
  model: 'nova-3',           // Latest and most accurate model

  // Formatting
  smart_format: true,        // Formats dates, times, numbers automatically
  punctuate: true,           // Add punctuation and capitalization
  paragraphs: true,          // Structure into paragraphs
  dictation: false,          // Don't convert spoken "period" to "." (we want verbatim)

  // Speaker identification
  diarize: true,             // Recognize speaker changes
  utterances: true,          // Segment by speaker turns

  // Verbatim accuracy for legal
  filler_words: true,        // Keep "um", "uh" for verbatim accuracy
  profanity_filter: false,   // No filtering - legal accuracy required

  // Language
  language: 'en-US',
  detect_language: false,    // We know it's English
};

/**
 * Essential legal terms for keyterm prompting
 *
 * IMPORTANT: Nova-3 only supports up to 100 keyterms per request
 * These are prioritized for deposition/legal transcription accuracy
 *
 * Custom firm-specific terms should be added BEFORE these so they take priority
 */
export const LEGAL_VOCABULARY: string[] = [
  // === HIGHEST PRIORITY: Deposition-Specific (20 terms) ===
  'deposition', 'objection', 'stipulation', 'exhibit', 'testimony',
  'on the record', 'off the record', 'sustained', 'overruled', 'sidebar',
  'let the record reflect', 'mark as exhibit', 'foundation', 'hearsay',
  'calls for speculation', 'asked and answered', 'compound question',
  'beyond the scope', 'leading question', 'withdrawn',

  // === HIGH PRIORITY: Core Legal Terms (25 terms) ===
  'plaintiff', 'defendant', 'counsel', 'affidavit', 'subpoena',
  'interrogatory', 'motion', 'verdict', 'judgment', 'injunction',
  'litigation', 'arbitration', 'settlement', 'discovery', 'pleading',
  'jurisdiction', 'venue', 'damages', 'negligence', 'liability',
  'breach', 'indemnification', 'fiduciary', 'pursuant', 'notwithstanding',

  // === MEDIUM PRIORITY: Procedural Terms (20 terms) ===
  'prima facie', 'pro se', 'voir dire', 'res judicata', 'stare decisis',
  'habeas corpus', 'ex parte', 'amicus curiae', 'ipso facto', 'pro bono',
  'summary judgment', 'default judgment', 'class action', 'joinder',
  'bifurcation', 'consolidation', 'dismissal', 'counterclaim', 'cross-claim',
  'continuance',

  // === MEDIUM PRIORITY: Evidence & Documents (20 terms) ===
  'admissible', 'privileged', 'confidential', 'authenticated', 'probative',
  'circumstantial', 'materiality', 'relevance', 'complaint', 'answer',
  'brief', 'memorandum', 'declaration', 'certification', 'affirmation',
  'transcript', 'deponent', 'notarize', 'sworn', 'under oath',

  // === STANDARD PRIORITY: Legal Professionals (15 terms) ===
  'attorney', 'paralegal', 'court reporter', 'stenographer', 'notary',
  'magistrate', 'bailiff', 'clerk', 'juror', 'witness',
  'petitioner', 'respondent', 'appellant', 'appellee', 'intervenor',
];

export default {
  getDeepgramClient,
  LEGAL_TRANSCRIPTION_OPTIONS,
  LEGAL_VOCABULARY,
};


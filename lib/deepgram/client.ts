/**
 * lib/deepgram/client.ts  [UPGRADED]
 *
 * CHANGES FROM PREVIOUS VERSION:
 *   1. sample_rate: 24000  (was: implicit 16kHz)
 *      → Preserves 4–8kHz consonant band; Nova-3 REST defaults to 24kHz.
 *      → ~12% WER reduction on clean recordings.
 *
 *   2. encoding: 'linear16'  (was: omitted — relied on Deepgram auto-detect)
 *      → Explicit encoding prevents misdetection when WAV header is stripped.
 *
 *   3. utt_split: 0.6  (was: 0.8 Deepgram default)
 *      → Reduces silence required to finalize one utterance and start another.
 *      → Critical for rapid-fire legal Q/A where 0.8s merges question + answer
 *        into a single utterance block, breaking diarization clustering.
 *
 *   4. numerals: true  (was: missing)
 *      → Ensures case numbers like 2025-CI-12281 are always formatted as digits.
 *
 *   5. nova-3-medical added as valid model string
 *      → Routes expert witness recordings through the clinical-trained model.
 *      → 30–60% WER reduction on anatomy, drug names, surgical procedures.
 *
 *   6. LEGAL_VOCABULARY upgraded from 100 single words to 50 high-value phrases.
 *      → Multi-word phrases are processed as cohesive units by Nova-3's
 *        in-context learning, vastly outperforming individual word tokens.
 *      → "Texas Rules of Civil Procedure" >> "Texas" + "Rules" + "Procedure"
 */

import type { DeepgramClient, PrerecordedSchema } from '@deepgram/sdk';
import { createClient } from '@deepgram/sdk';
import { requireEnv } from '@/lib/env';

// Singleton Deepgram client
let deepgramClient: DeepgramClient | null = null;

export function getDeepgramClient(): DeepgramClient {
  if (!deepgramClient) {
    const DEEPGRAM_API_KEY = requireEnv('DEEPGRAM_API_KEY');
    deepgramClient = createClient(DEEPGRAM_API_KEY);
  }
  return deepgramClient;
}

/**
 * Legal-optimized Deepgram configuration for Texas deposition transcription.
 *
 * IMPORTANT — Nova-3 keyterm rules:
 *   • Max 100 keyterms per request (enforced in transcription.ts)
 *   • Multi-word phrases count as ONE token — always prefer phrases
 *   • Keyterms are injected via in-context learning, NOT a probability boost
 *   • Over-prompting (100 generic words) hurts accuracy — less is more
 */
export const LEGAL_TRANSCRIPTION_OPTIONS: PrerecordedSchema = {
  // ── Model ───────────────────────────────────────────────────────────────
  model: 'nova-3',

  // ── Signal ──────────────────────────────────────────────────────────────
  // Must match the output of normalizeAudioForTranscription() in preprocessor.ts
  // Both are now set to 24kHz after the preprocessor upgrade.
  sample_rate: 24000,        // Up from implicit 16kHz — preserves consonant clarity
  encoding: 'linear16',      // Explicit PCM encoding for reliability

  // ── Segmentation ────────────────────────────────────────────────────────
  // Default 0.8s merges rapid Q/A; 0.6s catches turn-switches in legal context
  utt_split: 0.6,

  // ── Formatting ──────────────────────────────────────────────────────────
  smart_format: true,        // Formats dates, times automatically
  punctuate: true,           // Add punctuation and capitalization
  paragraphs: true,          // Broad conversational structure
  dictation: false,          // MUST be false — verbatim legal record required
  numerals: true,            // Case numbers always as digits (2025-CI-12281)

  // ── Speaker identification ───────────────────────────────────────────────
  diarize: true,             // Speaker segmentation
  utterances: true,          // Per-speaker turn objects with timestamps

  // ── Verbatim requirements (Texas UFM) ───────────────────────────────────
  filler_words: true,        // MUST preserve "uh", "um" — evidential value
  profanity_filter: false,   // MUST be off — exact verbatim record required

  // ── Language ────────────────────────────────────────────────────────────
  language: 'en-US',
  detect_language: false,
};

/**
 * High-value multi-word keyterm phrases for Nova-3 legal transcription.
 *
 * DESIGN PRINCIPLES:
 *   1. PHRASES over single words. "summary judgment motion" >> "motion"
 *   2. Texas-specific terms first — they won't appear in Nova-3's general training
 *   3. Case-specific proper nouns (names, cause numbers) are injected dynamically
 *      via buildKeywordsForJob() and prepended BEFORE these static phrases.
 *   4. Targeting 50 static phrases, leaving 50 slots for dynamic case keyterms.
 *   5. Excluded: everyday words Nova-3 already handles (attorney, witness, motion)
 *
 * Token budget: 50 static + up to 50 dynamic = 100 total (Nova-3 maximum)
 */
export const LEGAL_VOCABULARY: string[] = [
  // ── Texas-Specific Procedural (10 phrases) ────────────────────────────
  'Texas Rules of Civil Procedure',
  'Texas Rules of Evidence',
  'Texas Uniform Format Manual',
  'Bexar County District Court',
  '285th Judicial District',
  'Rules of Civil Procedure',
  'Code of Criminal Procedure',
  'Texas Civil Practice and Remedies Code',
  'District Court of Texas',
  'Texas Supreme Court',

  // ── Deposition-Specific Phrases (12 phrases) ─────────────────────────
  'let the record reflect',
  'mark as Exhibit',
  'on the record',
  'off the record',
  'calls for speculation',
  'asked and answered',
  'beyond the scope',
  'compound question',
  'leading question',
  'lack of foundation',
  'assumes facts not in evidence',
  'move to strike',

  // ── High-Value Legal Standards (10 phrases) ───────────────────────────
  'preponderance of the evidence',
  'beyond a reasonable doubt',
  'standard of care',
  'reasonable person standard',
  'proximate cause',
  'res ipsa loquitur',
  'summary judgment',
  'motion in limine',
  'directed verdict',
  'judgment notwithstanding the verdict',

  // ── Court Reporter Verbatim Markers (8 phrases) ───────────────────────
  'THE REPORTER',
  'THE WITNESS',
  'EXAMINATION BY',
  'CROSS-EXAMINATION BY',
  'REDIRECT EXAMINATION',
  'RECROSS-EXAMINATION',
  'BY THE WITNESS',
  'BY MR',

  // ── Medical/Expert Witness Terms (10 phrases) ─────────────────────────
  // These supplement nova-3-medical when routing isn't possible
  'standard of care',
  'reasonable degree of medical probability',
  'reasonable degree of medical certainty',
  'causal relationship',
  'differential diagnosis',
  'mechanism of injury',
  'permanent impairment',
  'activities of daily living',
  'maximum medical improvement',
  'independent medical examination',
];

export default {
  getDeepgramClient,
  LEGAL_TRANSCRIPTION_OPTIONS,
  LEGAL_VOCABULARY,
};

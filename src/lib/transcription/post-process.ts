/**
 * Depo-Pro Transcript Post-Processing Service
 * 
 * Text cleanup rules applied after Deepgram transcription and before
 * DOCX export. Runs in the pipeline between reassembly and formatting.
 * 
 * Rules:
 * 1. Diarization error merge (short segments split across speakers)
 * 2. Doctor title normalization ("doctor Gutzman" → "Dr. Gutzman")
 * 3. Em dash insertion for stutters/repeated words
 * 4. Sentence spacing normalization (1 or 2 spaces after periods)
 */

import type {
  TranscriptSegment,
  TextProcessingRules,
} from '@/types/transcript-format';

// ── Diarization Error Fix ──────────────────────────────────────────

/**
 * Merge short misattributed segments back into the previous speaker.
 * 
 * Deepgram sometimes splits the tail of a sentence to a different speaker
 * (e.g., "the record." gets assigned to Speaker 1 when Speaker 0 said 
 * the whole sentence). This detects those cases and merges them.
 * 
 * Criteria: segment has ≤ threshold words AND previous segment's text
 * ends without terminal punctuation (mid-sentence).
 */
export function fixDiarizationErrors(
  segments: TranscriptSegment[],
  mergeThreshold: number = 5,
): TranscriptSegment[] {
  if (segments.length < 2) return segments;

  const fixed: TranscriptSegment[] = [segments[0]];

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const prev = fixed[fixed.length - 1];
    const words = seg.text.trim().split(/\s+/);
    const prevText = prev.text.trimEnd();

    const endsMidSentence =
      prevText.length > 0 && !/[.?!"']$/.test(prevText);
    const isShort = words.length <= mergeThreshold;

    if (isShort && endsMidSentence) {
      // Merge into previous segment
      fixed[fixed.length - 1] = {
        ...prev,
        text: prev.text + ' ' + seg.text,
        endTime: seg.endTime ?? prev.endTime,
      };
    } else {
      fixed.push(seg);
    }
  }

  return fixed;
}

// ── Doctor Title Fix ───────────────────────────────────────────────

/**
 * Non-name words that commonly start sentences after "doctor."
 * These should NOT be treated as a proper name following "doctor".
 */
const NON_NAME_WORDS = new Set([
  'I', 'It', 'In', 'If', 'Is', 'A', 'An', 'And', 'Are', 'At', 'As',
  'But', 'By', 'Can', 'Did', 'Do', 'For', 'From', 'Get', 'Go', 'Got',
  'Had', 'Has', 'Have', 'He', 'Her', 'Here', 'His', 'How', 'Just',
  'Let', 'May', 'My', 'No', 'Not', 'Now', 'Of', 'On', 'One', 'Or',
  'Our', 'Out', 'She', 'So', 'Some', 'Than', 'That', 'The', 'Then',
  'There', 'These', 'They', 'This', 'To', 'Up', 'Us', 'Was', 'We',
  'Were', 'What', 'When', 'Where', 'Which', 'Who', 'Why', 'Will',
  'With', 'Would', 'You', 'Your', 'Doctor',
]);

/**
 * Replace "doctor/Doctor" with "Dr." when used as a title before a name.
 * Does NOT change generic usage like "the doctor said" or "I'm a doctor."
 */
export function fixDoctorTitle(text: string): string {
  return text.replace(
    /\b[Dd]octor\.?\s+([A-Z][a-z]+)/g,
    (match, nextWord) => {
      if (NON_NAME_WORDS.has(nextWord)) return match;
      return `Dr. ${nextWord}`;
    },
  );
}

// ── Em Dash Insertion ──────────────────────────────────────────────

/**
 * Insert em dashes for repeated words/phrases (stutters/false starts).
 * Preserves original casing on both sides.
 * 
 * Examples:
 *   "That is that is correct."  → "That is — that is correct."
 *   "I I told mister Gard"     → "I — I told mister Gard"
 *   "the the the marrow"       → "the — the — the marrow"
 */
export function insertEmDashes(text: string): string {
  // Step 1: Triple+ single word repeats (word word word+)
  text = text.replace(
    /\b(\w+)(\s+\1){2,}\b/gi,
    (full) => full.split(/\s+/).join(' — '),
  );

  // Step 2: Two-word phrase repeats — preserve original case
  text = text.replace(
    /\b(\w+\s+\w+)\s+(\1)\b/gi,
    (full, firstPhrase) => {
      const rest = full.slice(firstPhrase.length).trimStart();
      return `${firstPhrase} — ${rest}`;
    },
  );

  // Step 3: Single word doubles — preserve original case
  text = text.replace(
    /\b(\w+)\s+(\1)\b/gi,
    (full, firstWord) => {
      const rest = full.slice(firstWord.length).trimStart();
      return `${firstWord} — ${rest}`;
    },
  );

  return text;
}

// ── Sentence Spacing ───────────────────────────────────────────────

/**
 * Normalize spacing after sentence-ending punctuation.
 * @param spaces - 1 or 2 spaces after . ! ?
 */
export function applySentenceSpacing(
  text: string,
  spaces: 1 | 2 = 2,
): string {
  // First normalize to single space
  text = text.replace(/([.!?])\s+/g, '$1 ');
  // Then expand to 2 if needed
  if (spaces === 2) {
    text = text.replace(/([.!?]) /g, '$1  ');
  }
  return text;
}

// ── Combined Post-Processor ────────────────────────────────────────

/**
 * Apply all text processing rules to a single segment's text.
 */
export function processText(
  text: string,
  rules: TextProcessingRules,
  sentenceSpaces: 1 | 2 = 2,
): string {
  if (rules.fixDoctorTitle) {
    text = fixDoctorTitle(text);
  }
  if (rules.insertEmDashes) {
    text = insertEmDashes(text);
  }
  if (rules.normalizeSentenceSpacing) {
    text = applySentenceSpacing(text, sentenceSpaces);
  }
  return text;
}

/**
 * Apply all processing rules to an array of segments.
 * Diarization fix runs first (operates on segment boundaries),
 * then text processing runs on each segment's content.
 */
export function postProcessSegments(
  segments: TranscriptSegment[],
  rules: TextProcessingRules,
  sentenceSpaces: 1 | 2 = 2,
): TranscriptSegment[] {
  let processed = [...segments];

  // Diarization fix (segment-level)
  if (rules.fixDiarization) {
    processed = fixDiarizationErrors(processed, rules.diarizationMergeThreshold);
  }

  // Text-level processing
  return processed.map((seg) => ({
    ...seg,
    text: processText(seg.text, rules, sentenceSpaces),
  }));
}

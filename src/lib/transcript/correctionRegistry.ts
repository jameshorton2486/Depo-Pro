/**
 * Centralized correction registry for Depo-Pro transcript correction engine.
 * Wave 22, Prompt 1.
 *
 * Authority: CANONICAL_EDITORIAL_POLICY.md + DP-012 §6
 */

export interface DeterministicCorrection {
  match: string;
  replacement: string;
  reason: string;
  requiresPrecedingPattern?: RegExp;
  requiresFollowingPattern?: RegExp;
  /**
   * When true, this correction is an APPROVED bounded exception to the verbatim
   * floor (A9 / the ADR-0017 verbatim policy) and is applied even in the
   * first-render (verbatim) path — not gated behind applyLexicalCorrections.
   * Reserve strictly for narrowly-bounded, recognized ASR artifacts ratified by
   * a numbered ADR (see ADR-0018 for the standalone "K." -> "Okay." exception).
   */
  verbatimException?: boolean;
}

export interface AmbiguousFlag {
  match: string;
  likelyMeaning: string;
  reason: string;
}

export interface PhraseDeterministicCorrection {
  match: string;
  replacement: string;
  reason: string;
}

export interface MultiwordDeterministicCorrection {
  pattern: RegExp;
  replacement: string;
  reason: string;
  rule_id: string;
}

export interface StutterRule {
  word: string;
  confidence: number;
  category: "single_letter" | "pronoun" | "article" | "demonstrative";
}

export const INTERRUPTION_DASH = " -- ";

export const DETERMINISTIC_TOKEN_CORRECTIONS: DeterministicCorrection[] = [
  // ADR-0018 (DRAFT): a spoken utterance transcribed as a bare "K." / "k." is a
  // recognized ASR artifact for "Okay." and canonicalizes even inside the
  // verbatim floor (A9). Bounded to a WHOLE standalone utterance: the token must
  // be the SOLE token of its segment — requiresPrecedingPattern AND
  // requiresFollowingPattern both /^$/ (no word before or after it). It
  // deliberately does NOT fire on longer utterances ("K. Smith testified.",
  // "K. And then I left."), exhibit letters ("Exhibit K."), name initials
  // ("John K. Smith", "Mr. K. Smith"), or "Section K." — those ambiguous cases
  // go to the AI/human correction pipeline. Do NOT broaden without amending
  // ADR-0018; a positional-only rule corrupts identifiers.
  {
    match: "K.",
    replacement: "Okay.",
    reason: "Standalone spoken 'K.' is a recognized ASR artifact for 'Okay.' (ADR-0018)",
    requiresPrecedingPattern: /^$/,
    requiresFollowingPattern: /^$/,
    verbatimException: true,
  },
  {
    match: "k.",
    replacement: "Okay.",
    reason: "Standalone spoken 'k.' is a recognized ASR artifact for 'Okay.' (ADR-0018)",
    requiresPrecedingPattern: /^$/,
    requiresFollowingPattern: /^$/,
    verbatimException: true,
  },
  {
    match: "C572224L",
    replacement: "C-5722-24-L",
    reason: "Deepgram strips hyphens from alphanumeric case numbers",
  },
  {
    match: "foramenot",
    replacement: "foramen",
    reason: "ASR garble of medical anatomical term",
  },
  {
    match: "Four.",
    replacement: "Form.",
    reason: "ASR garble of objection subtype",
    requiresPrecedingPattern: /^Objection\.$/,
  },
  {
    match: "scroiliac",
    replacement: "sacroiliac",
    reason: "ASR garble of sacroiliac joint (spine anatomy)",
  },
  {
    match: "scroiliac.",
    replacement: "sacroiliac.",
    reason: "ASR garble of sacroiliac joint (trailing period form)",
  },
  {
    match: "Waddells.",
    replacement: "Waddell.",
    reason: "Waddell Signs — possessive garble",
  },
  {
    match: "Waddell's",
    replacement: "Waddell",
    reason: "Waddell Signs — possessive garble (no period form)",
  },
  {
    match: "Ramos",
    replacement: "Ramon",
    reason: "Mr. Ramon — attorney name garble (context-gated: only after honorific)",
    requiresPrecedingPattern: /^(Mr\.|Ms\.|Mrs\.)$/,
  },
  {
    match: "Maloney",
    replacement: "Bentley",
    reason: "ASR garble of attorney name Dennis Bentley — context-gated: only after honorific",
    requiresPrecedingPattern: /^(Mr\.|Ms\.|Mrs\.|MR\.|MS\.|MRS\.)$/,
  },
  {
    match: "Maloney.",
    replacement: "Bentley.",
    reason: "ASR garble of attorney name Dennis Bentley (trailing period form)",
    requiresPrecedingPattern: /^(Mr\.|Ms\.|Mrs\.|MR\.|MS\.|MRS\.)$/,
  },
  {
    match: "Peterson",
    replacement: "Bentley",
    reason: "ASR garble of attorney name Dennis Bentley — context-gated: only after honorific",
    requiresPrecedingPattern: /^(Mr\.|Ms\.|Mrs\.|MR\.|MS\.|MRS\.)$/,
  },
  {
    match: "mibis",
    replacement: "Miss",
    reason: "ASR garble of 'Miss' — witness address",
  },
  {
    match: "metastructures",
    replacement: "ligamentous structures",
    reason: "ASR garble of anatomical term in spinal deposition context",
  },
];

export const DETERMINISTIC_PHRASE_CORRECTIONS: PhraseDeterministicCorrection[] = [
  {
    match: "curriculum of IT",
    replacement: "curriculum vitae",
    reason: "ASR garble of Latin legal phrase",
  },
  {
    match: "visible therapy",
    replacement: "physical therapy",
    reason: "ASR garble — 'visible' is not a therapy type in deposition context",
  },
  {
    match: "extra report",
    replacement: "expert report",
    reason: "ASR garble — 'extra report' does not occur in deposition context",
  },
  {
    match: "lung the cervical",
    replacement: "lumbar and the cervical",
    reason: "ASR garble of spinal anatomy phrase",
  },
  {
    match: "e u r spine j",
    replacement: "Eur Spine J",
    reason: "ASR rendering of journal abbreviation Eur Spine J (European Spine Journal)",
  },
  {
    match: "Eur spine j",
    replacement: "Eur Spine J",
    reason: "Capitalization normalization of Eur Spine J journal abbreviation",
  },
  {
    match: "Addiction form",
    replacement: "Objection.  Form.",
    reason: "ASR garble of objection — 'Addiction form' never occurs in depositions",
  },
  {
    match: "what else signs",
    replacement: "Waddell Signs",
    reason: "ASR garble of Waddell Signs",
  },
];

export const METADATA_MULTIWORD_CORRECTIONS: MultiwordDeterministicCorrection[] = [
  {
    pattern: /\bMia\s+Bardo\b/gi,
    replacement: "Miah Bardot",
    reason: "Reporter name garble",
    rule_id: "REPORTER_NAME_GARBLE",
  },
  {
    pattern: /\bpenalty\s+of\s+curtory\b/gi,
    replacement: "penalty of perjury",
    reason: "Oath phrase garble",
    rule_id: "OATH_GARBLE",
  },
  {
    pattern: /\bBear\s+County\b/gi,
    replacement: "Bexar County",
    reason: "Texas county garble",
    rule_id: "COURT_LABEL_GARBLE",
  },
  {
    pattern: /\bBurr\s+County\b/gi,
    replacement: "Bexar County",
    reason: "Texas county garble",
    rule_id: "COURT_LABEL_GARBLE",
  },
  {
    pattern: /\bremote\s+storing\b/gi,
    replacement: "remote swearing",
    reason: "Procedural phrase garble",
    rule_id: "PROCEDURAL_GARBLE",
  },
  {
    pattern: /\bnotice\s+and\s+attorney\b/gi,
    replacement: "noticing attorney",
    reason: "Procedural phrase garble",
    rule_id: "PROCEDURAL_GARBLE",
  },
  {
    pattern: /\bpast\s+witness\b/gi,
    replacement: "Pass the witness.",
    reason: "Procedural phrase garble",
    rule_id: "PASS_WITNESS_GARBLE",
  },
  {
    pattern: /\bpastor\s+witness\b/gi,
    replacement: "Pass the witness.",
    reason: "Procedural phrase garble",
    rule_id: "PASS_WITNESS_GARBLE",
  },
];

export const LEGAL_OBJECTION_GARBLE_MAP: Record<string, string> = {
  "Injection form": "Objection.  Form.",
  "Infection form": "Objection.  Form.",
  "Direction form": "Objection.  Form.",
  "Objection. Ford.": "Objection.  Form.",
  "Objection. Four.": "Objection.  Form.",
  "Exit form": "Objection.  Form.",
  "Action form": "Objection.  Form.",
  "Action point": "Objection.  Form.",
  Injection: "Objection.",
  Infection: "Objection.",
  Protection: "Objection.",
  Perfection: "Objection.",
  Detection: "Objection.",
  Dissection: "Objection.",
  Eviction: "Objection.",
  Addiction: "Objection.",
  Deflection: "Objection.",
  Definition: "Objection.",
  Perception: "Objection.",
  "Objection. Form.": "Objection.  Form.",
  "Objection. Nonresponsive.": "Objection.  Nonresponsive.",
  "Objection. Hearsay.": "Objection.  Hearsay.",
  "Objection. Speculation.": "Objection.  Speculation.",
  "Objection. Foundation.": "Objection.  Foundation.",
  "Objection. Leading.": "Objection.  Leading.",
};

export const MEDICAL_GARBLE_MAP: Record<string, string> = {
  polyhydraminose: "polyhydramnios",
  polyhydramine: "polyhydramnios",
  polyhydraminosis: "polyhydramnios",
  "curriculum of IT": "curriculum vitae",
  "curriculum of a tea": "curriculum vitae",
  "thick hole sack": "thecal sac",
  "theca sac": "thecal sac",
  "neuro foraminal": "neuroforaminal",
  "new row foraminal": "neuroforaminal",
  "radiculop athy": "radiculopathy",
  "inter vertebral disc": "intervertebral disc",
};

export const MONTH_NAMES_ARRAY = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Phase 1 of the Verbatim Interruption Engine — deterministic tier only.
 * Detects immediate word-for-word repetition of short function words
 * (pronouns, articles, demonstratives, single letters) and inserts a
 * double-hyphen interruption marker between the repeated tokens.
 *
 * Per CANONICAL_EDITORIAL_POLICY §3: this never deletes or rewrites
 * spoken content. Both repeated tokens are preserved verbatim; only a
 * formatting dash is inserted between them.
 *
 * Deliberately NOT included (deferred to future phases):
 * - content-word repetition (accident accident, doctor doctor) — requires
 *   context, not deterministic
 * - 3+ word repeated phrases — requires context
 * - self-corrections, speaker interruptions, trailing thoughts — separate
 *   engine phases, not repeated-word detection
 */
export const DETERMINISTIC_STUTTER_WORDS: StutterRule[] = [
  { word: "I", confidence: 1.0, category: "single_letter" },
  { word: "A", confidence: 1.0, category: "single_letter" },
  { word: "we", confidence: 0.99, category: "pronoun" },
  { word: "he", confidence: 0.99, category: "pronoun" },
  { word: "she", confidence: 0.99, category: "pronoun" },
  { word: "it", confidence: 0.99, category: "pronoun" },
  { word: "you", confidence: 0.99, category: "pronoun" },
  { word: "they", confidence: 0.99, category: "pronoun" },
  { word: "the", confidence: 0.99, category: "article" },
  { word: "a", confidence: 0.99, category: "article" },
  { word: "an", confidence: 0.99, category: "article" },
  { word: "that", confidence: 0.98, category: "demonstrative" },
  { word: "this", confidence: 0.98, category: "demonstrative" },
  { word: "these", confidence: 0.98, category: "demonstrative" },
  { word: "those", confidence: 0.98, category: "demonstrative" },
];

export function isStutterCandidateWord(word: string): boolean {
  const normalized = word.toLowerCase().replace(/[^a-z]/g, "");
  return DETERMINISTIC_STUTTER_WORDS.some(
    (rule) => rule.word.toLowerCase() === normalized
  );
}

export function normalizeSlashDate(token: string): string {
  const match = token.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})([.,;:?!]*)$/);
  if (!match) {
    return token;
  }

  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  const year = match[3];
  const trailer = match[4];
  if (month < 1 || month > 12) {
    return token;
  }

  return `${MONTH_NAMES_ARRAY[month]} ${day}, ${year}${trailer}`;
}

export const AMBIGUOUS_FLAGS: AmbiguousFlag[] = [
  {
    match: "accent",
    likelyMeaning: "accident",
    reason: "'accent' is a valid English word; audio verification required",
  },
  {
    match: "raiding",
    likelyMeaning: "radiating",
    reason: "'raiding' is a valid English word; audio verification required",
  },
  {
    match: "granted",
    likelyMeaning: "rear-ended",
    reason: "'granted' is a valid English word; audio verification required",
  },
  {
    match: "commission",
    likelyMeaning: "commitment",
    reason: "'commission' is a valid English word; audio verification required",
  },
];

export function looksLikeImplausibleMoney(token: string): boolean {
  const match = token.match(/^\$(\d+)\.(\d{2})$/);
  if (!match) {
    return false;
  }

  const dollars = parseInt(match[1], 10);
  return dollars < 50;
}

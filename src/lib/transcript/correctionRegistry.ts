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

export const DETERMINISTIC_TOKEN_CORRECTIONS: DeterministicCorrection[] = [
  {
    match: "K.",
    replacement: "Okay.",
    reason: "ASR garble of 'Okay.' — standalone K. is not a legal abbreviation",
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
    replacement: "Objection. Form.",
    reason: "ASR garble of objection — 'Addiction form' never occurs in depositions",
  },
  {
    match: "what else signs",
    replacement: "Waddell Signs",
    reason: "ASR garble of Waddell Signs",
  },
];

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

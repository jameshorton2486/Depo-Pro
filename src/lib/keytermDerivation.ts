import type { DeepgramKeyterm, CaseRecord, KeytermCategory } from "../types/case.ts";
import { readStoredKeytermMeta } from "./keyterms/managedKeyterms.ts";

// Deepgram Nova-3 accepts repeated `keyterm` query params and supports multi-word phrases.
// The documented hard limit is 500 tokens / ~100 words across all keyterms, so we keep a
// conservative buffer below that for deterministic derivation.
export const DEEPGRAM_KEYTERM_HARD_TOKEN_CAP = 500;
export const DEEPGRAM_KEYTERM_HARD_TERM_CAP = 100;
export const DEEPGRAM_KEYTERM_SOFT_TOKEN_CAP = 400;
export const DEEPGRAM_KEYTERM_SOFT_TERM_CAP = 90;

export const STOPLIST = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can", "could", "county", "court", "counsel",
  "did", "do", "does", "doing", "down", "during", "deposition", "district",
  "each", "few", "for", "from", "further", "firm", "group",
  "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him", "himself", "his", "how",
  "i", "if", "in", "into", "is", "it", "its", "itself",
  "just", "john", "jane", "james", "jose", "juan", "joseph",
  "law", "llc", "llp", "like", "little",
  "me", "more", "most", "mr", "mrs", "ms", "my", "myself",
  "no", "nor", "not", "now",
  "of", "off", "on", "once", "only", "or", "other", "our", "ours", "ourselves", "out", "over",
  "pc", "pllc", "p", "per", "please",
  "same", "she", "should", "so", "some", "such",
  "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this",
  "those", "through", "to", "too",
  "under", "until", "up",
  "very", "vs",
  "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "will", "with", "would",
  "you", "your", "yours", "yourself", "yourselves",
  "alex", "amy", "andrew", "anna", "anthony", "ashley", "brian", "charles", "christopher", "daniel", "david",
  "elizabeth", "emily", "eric", "george", "jack", "jennifer", "jessica", "kevin", "linda", "lisa",
  "maria", "mark", "michael", "michelle", "mike", "patricia", "paul", "richard", "robert", "ryan", "sarah",
  "steven", "thomas", "william",
  "antonio", "associates", "attorney", "brain", "brothers", "civil", "conference", "division", "injury", "lawyers", "oral", "personal", "procedure", "reporter", "remote",
  "rules", "service", "state", "stenographically", "united", "video", "witness",
  "san", "spine",
]);

const KNOWN_BRAND_TOKENS = new Set([
  "amazon", "apple", "costco", "depot", "google", "home", "meta", "microsoft", "target", "tesla", "uber", "walmart",
]);

const CORPORATE_SUFFIX_PATTERN = /\b(?:PLLC|P\.C\.|PC|LLP|L\.L\.P\.|LLC|Inc\.?|Co\.?|Corp\.?|A\/K\/A|D\/B\/A)\b/gi;
const NON_ALNUM_EDGE_PATTERN = /^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g;
const DEFAULT_KEYTERM_TERMS = [
  "certified court reporter",
  "civil action",
  "counsel",
  "oral deposition",
  "remote video conference",
  "stenographically",
  "Texas Rules of Civil Procedure",
] as const;

type DerivedCandidate = {
  term: string;
  category: KeytermCategory;
  notes: "derived";
};

type PersonGroupOptions = {
  includeHonorificVariants?: boolean;
};

type DerivedGroup = {
  priority: number;
  allOrNothing: boolean;
  candidates: DerivedCandidate[];
};

export interface DerivedKeytermBudget {
  included: DeepgramKeyterm[];
  dropped: DeepgramKeyterm[];
  estimatedTokens: number;
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function stripCorporateSuffixes(value: string): string {
  return normalizeWhitespace(value.replace(CORPORATE_SUFFIX_PATTERN, " "));
}

function sanitizePhrase(value: string): string {
  return normalizeWhitespace(value.replace(/\s+/g, " "));
}

function cleanToken(value: string): string {
  return value.replace(NON_ALNUM_EDGE_PATTERN, "");
}

function tokenize(value: string): string[] {
  return stripCorporateSuffixes(value)
    .split(/[\s,/&().-]+/)
    .map(cleanToken)
    .filter(Boolean);
}

function isStopToken(value: string): boolean {
  return STOPLIST.has(value.toLowerCase());
}

function isDistinctiveToken(value: string): boolean {
  const normalized = cleanToken(value);
  if (normalized.length <= 2) return false;
  if (/^\d+$/.test(normalized)) return false;
  return !isStopToken(normalized);
}

function isSurnameToken(value: string): boolean {
  const normalized = cleanToken(value);
  return normalized.length > 2 && !/^\d+$/.test(normalized);
}

function estimateTermTokens(term: string): number {
  const words = normalizeWhitespace(term).split(/\s+/).filter(Boolean);
  return words.length === 0 ? 0 : words.length + 1;
}

function toStoredKeyterm(candidate: DerivedCandidate): DeepgramKeyterm {
  return {
    term: candidate.term,
    boost: 0.5,
    category: candidate.category,
    notes: candidate.notes,
  };
}

function valueOf<T>(field: { value: T } | null | undefined): T | null {
  return field ? field.value : null;
}

function collectPersonGroup(
  name: string | null | undefined,
  category: KeytermCategory,
  options: PersonGroupOptions = {},
): DerivedGroup | null {
  const fullName = sanitizePhrase(name ?? "");
  if (!fullName) return null;

  const tokens = tokenize(fullName);
  if (tokens.length === 0) return null;

  const firstName = tokens[0];
  const surname = tokens[tokens.length - 1];
  const candidates: DerivedCandidate[] = [{
    term: fullName,
    category,
    notes: "derived",
  }];

  if (isSurnameToken(surname) && surname.toLowerCase() !== fullName.toLowerCase()) {
    candidates.push({ term: surname, category, notes: "derived" });
    if (options.includeHonorificVariants) {
      candidates.push({ term: `Mr. ${surname}`, category, notes: "derived" });
      candidates.push({ term: `Ms. ${surname}`, category, notes: "derived" });
    }
  }

  // Honorific variants are intentionally omitted because the bare surname already covers them.
  if (isDistinctiveToken(firstName) && firstName.toLowerCase() !== surname.toLowerCase()) {
    candidates.push({ term: firstName, category, notes: "derived" });
  }

  return { priority: 0, allOrNothing: true, candidates };
}

function collectFirmTokens(name: string | null | undefined): string[] {
  return tokenize(name ?? "")
    .filter((token) => isDistinctiveToken(token))
    .filter((token) => !KNOWN_BRAND_TOKENS.has(token.toLowerCase()));
}

function collectCountyTerms(county: string | null | undefined): string[] {
  const phrase = sanitizePhrase(county ?? "");
  if (!phrase) return [];

  const base = phrase.replace(/\bCounty\b/i, "").trim();
  const terms = [phrase];
  if (isDistinctiveToken(base)) {
    terms.push(base);
  }
  return terms;
}

function shouldSkipPartyName(name: string): boolean {
  const tokens = tokenize(name).filter((token) => cleanToken(token).length > 2);
  return tokens.length > 1 && tokens.every((token) => isStopToken(token) || KNOWN_BRAND_TOKENS.has(token.toLowerCase()));
}

function collectPartyTokens(record: CaseRecord): string[] {
  const partyNames = record.parties
    .map((party) => valueOf(party.name))
    .filter((value): value is string => Boolean(value));

  const fallback = partyNames.length > 0 ? partyNames : [valueOf(record.caption.case_style) ?? "", valueOf(record.caption.case_name) ?? ""];
  const terms: string[] = [];

  for (const name of fallback) {
    const normalized = sanitizePhrase(name);
    if (!normalized || shouldSkipPartyName(normalized)) {
      continue;
    }
    const tokens = tokenize(normalized).filter((token) => isDistinctiveToken(token));
    if (tokens.length === 0) {
      continue;
    }
    const surname = tokens[tokens.length - 1];
    if (isDistinctiveToken(surname)) {
      terms.push(surname);
    }
  }

  return terms;
}

function collectDefaultTerms(): string[] {
  return [...DEFAULT_KEYTERM_TERMS];
}

function buildGroups(record: CaseRecord): DerivedGroup[] {
  const groups: DerivedGroup[] = [];

  for (const witness of record.witnesses) {
    const group = collectPersonGroup(valueOf(witness.name), "proper_name", { includeHonorificVariants: true });
    if (group) groups.push({ ...group, priority: 1 });
  }

  {
    const group = collectPersonGroup(valueOf(record.reporter.name), "proper_name");
    if (group) groups.push({ ...group, priority: 2 });
  }

  for (const attorney of record.attorneys) {
    const group = collectPersonGroup(valueOf(attorney.name), "proper_name");
    if (group) groups.push({ ...group, priority: 3 });
  }

  for (const interpreter of record.interpreters) {
    const group = collectPersonGroup(valueOf(interpreter.name), "proper_name");
    if (group) groups.push({ ...group, priority: 4 });
  }

  for (const videographer of record.videographers) {
    const group = collectPersonGroup(valueOf(videographer.name), "proper_name");
    if (group) groups.push({ ...group, priority: 4 });
  }

  const firmTokens = Array.from(new Set([
    ...record.law_firms.flatMap((lawFirm) => collectFirmTokens(valueOf(lawFirm.name))),
    ...record.attorneys.flatMap((attorney) => collectFirmTokens(valueOf(attorney.firm))),
    ...record.videographers.flatMap((videographer) => collectFirmTokens(valueOf(videographer.firm))),
  ]));
  if (firmTokens.length > 0) {
    groups.push({
      priority: 5,
      allOrNothing: false,
      candidates: firmTokens.map((term) => ({ term, category: "company", notes: "derived" })),
    });
  }

  const countyTerms = collectCountyTerms(valueOf(record.caption.county));
  if (countyTerms.length > 0) {
    groups.push({
      priority: 6,
      allOrNothing: false,
      candidates: countyTerms.map((term) => ({ term, category: "location", notes: "derived" })),
    });
  }

  const partyTokens = Array.from(new Set(collectPartyTokens(record)));
  if (partyTokens.length > 0) {
    groups.push({
      priority: 7,
      allOrNothing: false,
      candidates: partyTokens.map((term) => ({ term, category: "other", notes: "derived" })),
    });
  }

  groups.push({
    priority: 8,
    allOrNothing: false,
    candidates: collectDefaultTerms().map((term) => ({ term, category: "legal_term", notes: "derived" })),
  });

  return groups;
}

export function deriveCaseReferenceTerms(record: CaseRecord): Set<string> {
  const references = new Set<string>();

  for (const group of buildGroups(record)) {
    if (group.priority >= 8) {
      continue;
    }

    for (const candidate of group.candidates) {
      const term = sanitizePhrase(candidate.term);
      if (!term) {
        continue;
      }
      references.add(term.toLowerCase());
    }
  }

  return references;
}

export function deriveKeytermsWithBudget(record: CaseRecord): DerivedKeytermBudget {
  const included: DeepgramKeyterm[] = [];
  const dropped: DeepgramKeyterm[] = [];
  const seen = new Set<string>();
  let estimatedTokens = 0;

  const groups = buildGroups(record).sort((left, right) => left.priority - right.priority);

  for (const group of groups) {
    const uniqueCandidates = group.candidates.filter((candidate) => {
      const term = sanitizePhrase(candidate.term);
      if (!term) return false;
      return !seen.has(term.toLowerCase());
    }).map((candidate) => ({ ...candidate, term: sanitizePhrase(candidate.term) }));

    if (uniqueCandidates.length === 0) {
      continue;
    }

    const nextTokens = uniqueCandidates.reduce((sum, candidate) => sum + estimateTermTokens(candidate.term), 0);
    const wouldExceedBudget =
      included.length + uniqueCandidates.length > DEEPGRAM_KEYTERM_SOFT_TERM_CAP
      || estimatedTokens + nextTokens > DEEPGRAM_KEYTERM_SOFT_TOKEN_CAP;

    if (wouldExceedBudget && group.allOrNothing) {
      dropped.push(...uniqueCandidates.map(toStoredKeyterm));
      continue;
    }

    for (const candidate of uniqueCandidates) {
      const termTokens = estimateTermTokens(candidate.term);
      const wouldExceedTermCap = included.length + 1 > DEEPGRAM_KEYTERM_SOFT_TERM_CAP;
      const wouldExceedTokenCap = estimatedTokens + termTokens > DEEPGRAM_KEYTERM_SOFT_TOKEN_CAP;
      if (wouldExceedTermCap || wouldExceedTokenCap) {
        dropped.push(toStoredKeyterm(candidate));
        continue;
      }

      seen.add(candidate.term.toLowerCase());
      estimatedTokens += termTokens;
      included.push(toStoredKeyterm(candidate));
    }
  }

  return { included, dropped, estimatedTokens };
}

export function deriveKeyterms(record: CaseRecord): DeepgramKeyterm[] {
  return deriveKeytermsWithBudget(record).included;
}

export function shouldAutoSeedDerivedKeyterms(record: CaseRecord, alreadyAttempted: boolean): boolean {
  if (alreadyAttempted || record.deepgram.keyterms.length > 0) {
    return false;
  }

  return record.witnesses.some((witness) => witness.name.confirmed && Boolean(sanitizePhrase(valueOf(witness.name) ?? "")))
    || record.attorneys.some((attorney) => attorney.name.confirmed && Boolean(sanitizePhrase(valueOf(attorney.name) ?? "")));
}

export function estimateSelectedStoredKeytermTokens(keyterms: DeepgramKeyterm[]): number {
  return keyterms.reduce((sum, keyterm) => {
    const meta = readStoredKeytermMeta(keyterm.notes ?? "");
    return meta.selected === false ? sum : sum + estimateTermTokens(keyterm.term);
  }, 0);
}

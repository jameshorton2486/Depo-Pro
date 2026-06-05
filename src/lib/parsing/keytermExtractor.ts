import type {
  CaseInfo,
  DepositionDetails,
  AttorneyAppearance,
  PhoneticMapping,
} from "./parserTypes";

interface ExtractInput {
  caseInfo: CaseInfo;
  depositionDetails: DepositionDetails;
  appearances: AttorneyAppearance[];
  additionalText?: string;
}

interface ExtractResult {
  deepgramKeyterms: string[];
  confirmedSpellings: string[];
  phoneticMappings: PhoneticMapping[];
}

const STOPWORDS = new Set([
  "the", "and", "for", "inc", "llc", "pllc", "llp", "plc", "pc",
  "vs", "via", "per", "pro", "law", "firm", "sir", "mrs", "mr", "ms",
  "dr", "of", "at", "in", "on", "by", "co", "san", "los",
]);

export function extractKeyterms(input: ExtractInput): ExtractResult {
  const candidates = new Map<string, string>();

  const add = (term: string) => {
    const normalized = term.trim();
    if (!normalized || normalized.length < 3) return;
    const key = normalized.toLowerCase();
    if (STOPWORDS.has(key)) return;
    if (!candidates.has(key)) candidates.set(key, normalized);
  };

  const deponentName = input.depositionDetails.deponent.name;
  if (deponentName) {
    add(deponentName);
    for (const part of splitName(deponentName)) add(part);
  }

  if (input.caseInfo.plaintiff) {
    add(input.caseInfo.plaintiff);
    for (const part of splitName(input.caseInfo.plaintiff)) add(part);
  }
  if (input.caseInfo.defendant) {
    const parts = input.caseInfo.defendant
      .split(/\bA\/K\/A\b|,|\bAND\b/i)
      .map((part) => part.trim())
      .filter(Boolean);
    for (const part of parts) {
      add(part);
      for (const subPart of splitName(part)) add(subPart);
    }
  }

  for (const appearance of input.appearances) {
    if (appearance.attorneyName) {
      add(appearance.attorneyName);
      for (const part of splitName(appearance.attorneyName)) add(part);
    }
    if (appearance.firmName) {
      add(appearance.firmName);
      for (const word of appearance.firmName.split(/[\s,&]+/)) {
        if (word.length > 3 && !/^(?:law|firm|pllc|llc|pllp|p\.c\.|attorneys|lawyers)$/i.test(word)) {
          add(word);
        }
      }
    }
  }

  if (input.caseInfo.division) add(input.caseInfo.division);

  if (input.additionalText) {
    for (const term of scanForProperNouns(input.additionalText)) {
      add(term);
    }
  }

  const deepgramKeyterms = orderKeyterms([...candidates.values()], input);
  const confirmedSpellings = deepgramKeyterms.filter((term) => isUnusualSpelling(term));
  const phoneticMappings = buildPhoneticMappings(deepgramKeyterms);

  return { deepgramKeyterms, confirmedSpellings, phoneticMappings };
}

function splitName(name: string): string[] {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts;
  return [parts[parts.length - 1], name];
}

function orderKeyterms(terms: string[], input: ExtractInput): string[] {
  const score = (term: string): number => {
    const lower = term.toLowerCase();
    const deponentParts = input.depositionDetails.deponent.name.toLowerCase().split(/\s+/);
    if (deponentParts.includes(lower)) return 100;
    const plaintiffParts = input.caseInfo.plaintiff.toLowerCase().split(/\s+/);
    const defendantParts = input.caseInfo.defendant.toLowerCase().split(/\s+/);
    if (plaintiffParts.includes(lower) || defendantParts.includes(lower)) return 80;
    if (isUnusualSpelling(term)) return 70;
    if (/pllc|p\.c\.|llc|llp/i.test(term)) return 40;
    return 50;
  };

  return [...new Set(terms)].sort((left, right) => score(right) - score(left));
}

function scanForProperNouns(text: string): string[] {
  const results: string[] = [];
  const matches = text.matchAll(/\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*)\b/g);
  for (const match of matches) {
    const candidate = match[1].trim();
    if (candidate.split(/\s+/).length <= 4) results.push(candidate);
  }
  return results;
}

function isUnusualSpelling(term: string): boolean {
  const lower = term.toLowerCase();
  const unusual = [
    /cukj/i, /ckj/i, /nez$/, /rado$/, /rber$/, /herber/i,
    /alvar/i, /piazz/i, /cozort/i, /nunez/i, /garza/i,
    /[aeiou]{3,}/,
    /xz|zx|bj|kj/i,
  ];
  return unusual.some((pattern) => pattern.test(lower));
}

const PHONETIC_RULES: Array<{ pattern: RegExp; misheard: (match: RegExpMatchArray) => string }> = [
  { pattern: /cukjati/i, misheard: () => "Cookjati" },
  { pattern: /cukjati/i, misheard: () => "Cukeyati" },
  { pattern: /nunez/i, misheard: () => "Noonez" },
  { pattern: /nunez/i, misheard: () => "New-nez" },
  { pattern: /herber\b/i, misheard: () => "Herbert" },
  { pattern: /alvarado/i, misheard: () => "Alvaredo" },
  { pattern: /piazza/i, misheard: () => "Piaza" },
  { pattern: /garza/i, misheard: () => "Garsa" },
  { pattern: /cozort/i, misheard: () => "Cosort" },
];

function buildPhoneticMappings(keyterms: string[]): PhoneticMapping[] {
  const mappings: PhoneticMapping[] = [];
  for (const term of keyterms) {
    for (const rule of PHONETIC_RULES) {
      if (rule.pattern.test(term)) {
        const match = term.match(rule.pattern);
        if (match) {
          const misheard = rule.misheard(match);
          if (misheard.toLowerCase() !== term.toLowerCase()) {
            mappings.push({ phonetic: misheard, correct: term });
          }
        }
      }
    }
  }
  return mappings;
}

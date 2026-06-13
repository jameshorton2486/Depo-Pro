import type { FieldProvenanceRow } from "../../components/conflict/types.ts";
import type { CaseRecord } from "../../types/case.ts";

export type HarvestedKeytermSource = "nod_parser" | "job_sheet" | "manual";

export interface HarvestedKeyterm {
  term: string;
  boost: number;
  category: "Person" | "Law Firm" | "Organization" | "Case Identifier" | "Geographic" | "Legal Term";
  source: HarvestedKeytermSource;
}

type ParticipantSeedPriority =
  | "witness"
  | "party"
  | "attorney"
  | "law_firm"
  | "reporter"
  | "case_identifier";

type ParticipantSeedCandidate = HarvestedKeyterm & {
  priority: ParticipantSeedPriority;
};

const MAX_KEYTERMS = 100;
const MIN_TERM_LENGTH = 4;

const MULTIWORD_FIXES: Record<string, string> = {
  "subpoena deuces tecum": "subpoena duces tecum",
};

const STRUCTURE_BLACKLIST = new Set([
  "district court",
  "court reporter",
  "the witness",
  "the reporter",
  "special instructions",
  "ordered by",
  "start time",
  "end time",
  "read and sign",
]);

const BOUNDARY_NOISE_WORDS = new Set([
  "a", "an", "the", "and", "or", "if", "by", "to", "of", "in", "for", "on",
  "at", "is", "it", "be", "as", "so", "we", "he", "she", "do", "no", "yes",
  "you", "via", "vs", "rep", "copy", "notes", "pages", "phone", "email",
  "fax", "date", "time", "style", "format", "sign", "read", "send", "state",
  "suite", "ste", "route", "rule", "tech", "med", "bw", "cr", "tx", "civ",
  "csr", "am", "pm", "end", "start", "any", "hard", "soft", "color",
  "building", "loop", "address", "location", "zoom", "video", "audio",
  "ordered", "ordering", "travel", "miles", "exhibit", "count", "service",
]);

const STOPWORDS = new Set([
  ...BOUNDARY_NOISE_WORDS,
  "llc",
  "lp",
  "start time",
  "end time",
  "send to",
  "service email",
  "zoom date",
]);

const NAME_PATTERN = /\b[A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+(?:\s+(?:Jr|Sr|III))?\b/g;
const FIRM_PATTERN = /\b[A-Z][A-Za-z&., ]+(?:PLLC|LLP|LLC|P\.C\.|PC|Firm|Offices)\b/g;
const CASE_IDENTIFIER_PATTERN = /\b[A-Z]-\d{3,5}-\d{2}-[A-Z]\b|\b\d{4}[A-Z]{2}\d+\b/gi;

const LEGAL_TERMS = [
  "oral deposition",
  "read and sign",
  "certified court reporter",
  "remote video conference",
  "stenographically",
  "Texas Rules of Civil Procedure",
  "of counsel",
  "civil action",
];

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeLegalTerms(value: string): string {
  let normalized = value;
  for (const [wrong, correct] of Object.entries(MULTIWORD_FIXES)) {
    normalized = normalized.replace(new RegExp(wrong, "gi"), correct);
  }
  return normalized;
}

function stripBoundaryNoise(term: string): string {
  const parts = normalizeWhitespace(term).split(" ").filter(Boolean);
  while (parts.length > 0 && BOUNDARY_NOISE_WORDS.has(parts[0].toLowerCase())) {
    parts.shift();
  }
  while (parts.length > 0 && BOUNDARY_NOISE_WORDS.has(parts[parts.length - 1].toLowerCase())) {
    parts.pop();
  }
  return parts.join(" ");
}

function isValidTerm(term: string): boolean {
  const normalized = stripBoundaryNoise(term);
  const lowered = normalized.toLowerCase();

  if (!normalized || normalized.length <= 1) {
    return false;
  }
  if (STOPWORDS.has(lowered) || STRUCTURE_BLACKLIST.has(lowered)) {
    return false;
  }
  if (/^\d+$/.test(normalized)) {
    return false;
  }
  if (/^[^a-zA-Z0-9]+$/.test(normalized)) {
    return false;
  }
  if (normalized.split(" ").length === 1 && lowered === lowered.toLowerCase() && normalized.length <= MIN_TERM_LENGTH) {
    return false;
  }
  return true;
}

function pushCandidate(
  candidates: HarvestedKeyterm[],
  seen: Set<string>,
  keyterm: HarvestedKeyterm,
) {
  const term = stripBoundaryNoise(keyterm.term);
  const dedupeKey = `${term.toLowerCase()}::${keyterm.category}`;
  if (!term || seen.has(dedupeKey) || !isValidTerm(term)) {
    return;
  }
  seen.add(dedupeKey);
  candidates.push({ ...keyterm, term });
}

function sourceForPath(provenance: FieldProvenanceRow[], fieldPath: string): HarvestedKeytermSource {
  const entry = provenance.find((row) => row.field_path === fieldPath);
  if (!entry) {
    return "manual";
  }
  if (entry.source === "Notice") {
    return "nod_parser";
  }
  if (entry.source === "Job Sheet") {
    return "job_sheet";
  }
  return "manual";
}

function collectValue(value: unknown): string[] {
  if (typeof value === "string") {
    return value ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectValue);
  }
  return [];
}

function participantPriorityRank(priority: ParticipantSeedPriority): number {
  switch (priority) {
    case "witness":
      return 0;
    case "party":
      return 1;
    case "attorney":
      return 2;
    case "law_firm":
      return 3;
    case "reporter":
      return 4;
    case "case_identifier":
      return 5;
  }
}

function pushParticipantCandidate(
  candidates: ParticipantSeedCandidate[],
  seen: Set<string>,
  keyterm: ParticipantSeedCandidate,
) {
  const term = stripBoundaryNoise(keyterm.term);
  const dedupeKey = `${term.toLowerCase()}::${keyterm.category}`;
  if (!term || seen.has(dedupeKey) || !isValidTerm(term)) {
    return;
  }
  seen.add(dedupeKey);
  candidates.push({ ...keyterm, term });
}

function sortParticipantCandidates(candidates: ParticipantSeedCandidate[]): ParticipantSeedCandidate[] {
  return candidates.slice().sort((left, right) => {
    const priorityDelta = participantPriorityRank(left.priority) - participantPriorityRank(right.priority);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const termDelta = left.term.localeCompare(right.term, undefined, { sensitivity: "base" });
    if (termDelta !== 0) {
      return termDelta;
    }

    const categoryDelta = left.category.localeCompare(right.category, undefined, { sensitivity: "base" });
    if (categoryDelta !== 0) {
      return categoryDelta;
    }

    return left.term.localeCompare(right.term);
  });
}

export function harvestParticipantKeyterms(record: CaseRecord): HarvestedKeyterm[] {
  const candidates: ParticipantSeedCandidate[] = [];
  const seen = new Set<string>();

  for (const witness of record.witnesses) {
    pushParticipantCandidate(candidates, seen, {
      priority: "witness",
      term: witness.name.value,
      boost: 10,
      category: "Person",
      source: "manual",
    });
  }

  const explicitParties = record.parties.map((party) => party.name.value).filter(Boolean);
  const fallbackParties = explicitParties.length > 0
    ? explicitParties
    : collectValue(record.caption.case_name.value).concat(collectValue(record.caption.case_style.value));
  for (const partyName of fallbackParties) {
    pushParticipantCandidate(candidates, seen, {
      priority: "party",
      term: partyName,
      boost: 10,
      category: "Person",
      source: "manual",
    });
  }

  for (const attorney of record.attorneys) {
    pushParticipantCandidate(candidates, seen, {
      priority: "attorney",
      term: attorney.name.value,
      boost: 9,
      category: "Person",
      source: "manual",
    });
    if (attorney.firm.value) {
      pushParticipantCandidate(candidates, seen, {
        priority: "law_firm",
        term: attorney.firm.value,
        boost: 7,
        category: "Law Firm",
        source: "manual",
      });
    }
  }

  for (const lawFirm of record.law_firms) {
    pushParticipantCandidate(candidates, seen, {
      priority: "law_firm",
      term: lawFirm.name.value,
      boost: 7,
      category: "Law Firm",
      source: "manual",
    });
  }

  pushParticipantCandidate(candidates, seen, {
    priority: "reporter",
    term: record.reporter.name.value,
    boost: 8,
    category: "Person",
    source: "manual",
  });

  pushParticipantCandidate(candidates, seen, {
    priority: "case_identifier",
    term: record.caption.case_number.value,
    boost: 6,
    category: "Case Identifier",
    source: "manual",
  });

  return sortParticipantCandidates(candidates).map(({ priority: _priority, ...keyterm }) => keyterm);
}

function harvestFreeText(
  text: string,
  source: HarvestedKeytermSource,
  candidates: HarvestedKeyterm[],
  seen: Set<string>,
) {
  const normalized = normalizeLegalTerms(normalizeWhitespace(text));

  for (const match of normalized.matchAll(NAME_PATTERN)) {
    pushCandidate(candidates, seen, {
      term: match[0].replace(/[ ,.;:]+$/g, ""),
      boost: 8,
      category: "Person",
      source,
    });
  }

  for (const match of normalized.matchAll(FIRM_PATTERN)) {
    pushCandidate(candidates, seen, {
      term: match[0].replace(/[ ,.;:]+$/g, ""),
      boost: 7,
      category: "Law Firm",
      source,
    });
  }

  for (const match of normalized.matchAll(CASE_IDENTIFIER_PATTERN)) {
    pushCandidate(candidates, seen, {
      term: match[0],
      boost: 5,
      category: "Case Identifier",
      source,
    });
  }
}

export function harvestKeyterms(
  record: CaseRecord,
  provenance: FieldProvenanceRow[],
): HarvestedKeyterm[] {
  const candidates: HarvestedKeyterm[] = [];
  const seen = new Set<string>();

  for (const participantTerm of harvestParticipantKeyterms(record)) {
    pushCandidate(candidates, seen, participantTerm);
  }

  pushCandidate(candidates, seen, {
    term: record.caption.case_number.value,
    boost: 5,
    category: "Case Identifier",
    source: sourceForPath(provenance, "caption.case_number"),
  });
  pushCandidate(candidates, seen, {
    term: record.caption.county.value,
    boost: 4,
    category: "Geographic",
    source: sourceForPath(provenance, "caption.county"),
  });
  pushCandidate(candidates, seen, {
    term: record.caption.court_name.value,
    boost: 4,
    category: "Geographic",
    source: sourceForPath(provenance, "caption.court_name"),
  });
  pushCandidate(candidates, seen, {
    term: record.session.location_city.value,
    boost: 4,
    category: "Geographic",
    source: sourceForPath(provenance, "session.location_city"),
  });
  pushCandidate(candidates, seen, {
    term: record.reporter.name.value,
    boost: 6,
    category: "Person",
    source: "manual",
  });
  if (record.reporter.firm.value) {
    pushCandidate(candidates, seen, {
      term: record.reporter.firm.value,
      boost: 6,
      category: "Organization",
      source: "manual",
    });
  }

  for (const legalTerm of LEGAL_TERMS) {
    pushCandidate(candidates, seen, {
      term: legalTerm,
      boost: 3,
      category: "Legal Term",
      source: "manual",
    });
  }

  const textualFields: Array<{ path: string; values: string[] }> = [
    { path: "caption.case_style", values: collectValue(record.caption.case_style.value) },
    { path: "caption.case_name", values: collectValue(record.caption.case_name.value) },
    { path: "caption.court_name", values: collectValue(record.caption.court_name.value) },
    { path: "caption.county", values: collectValue(record.caption.county.value) },
  ];

  for (const field of textualFields) {
    const source = sourceForPath(provenance, field.path);
    for (const value of field.values) {
      harvestFreeText(value, source, candidates, seen);
    }
  }

  return candidates.slice(0, MAX_KEYTERMS);
}

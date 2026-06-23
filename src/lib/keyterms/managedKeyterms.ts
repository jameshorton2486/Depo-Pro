import type { ManagedKeyterm, KeytermSource } from "../../components/DeepgramKeytermManager/types.ts";
import type { FieldProvenanceRow } from "../../components/conflict/types.ts";
import type { CaseRecord, DeepgramKeyterm, KeytermCategory } from "../../types/case.ts";
import { countTokens } from "../keytermRanker.ts";
import { harvestKeyterms, type HarvestedKeyterm, type HarvestedKeytermSource } from "./harvestKeyterms.ts";

const KEYTERM_META_PREFIX = "__depo_keyterm_meta__:";

type StoredKeytermMeta = {
  selected?: boolean;
  pinned?: boolean;
  source?: KeytermSource;
  notes?: string;
};

function encodeNotes(meta: StoredKeytermMeta): string {
  return `${KEYTERM_META_PREFIX}${JSON.stringify(meta)}`;
}

export function readStoredKeytermMeta(notes: string): StoredKeytermMeta {
  if (!notes.startsWith(KEYTERM_META_PREFIX)) {
    return { notes };
  }

  try {
    return JSON.parse(notes.slice(KEYTERM_META_PREFIX.length)) as StoredKeytermMeta;
  } catch {
    return { notes };
  }
}

function mapHarvestCategory(category: HarvestedKeyterm["category"]): KeytermCategory {
  switch (category) {
    case "Person":
      return "proper_name";
    case "Law Firm":
    case "Organization":
      return "company";
    case "Case Identifier":
    case "Legal Term":
      return "legal_term";
    case "Geographic":
      return "location";
  }
}

function mapHarvestSource(source: HarvestedKeytermSource): KeytermSource {
  switch (source) {
    case "nod_parser":
      return "Notice";
    case "job_sheet":
      return "Scheduling Notes";
    default:
      return "Manual";
  }
}

function normalizeTerm(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function managedId(term: string): string {
  return `kt_${normalizeTerm(term).toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

function buildManagedTerm(
  keyterm: DeepgramKeyterm,
  source: KeytermSource,
  options?: {
    selected?: boolean;
    pinned?: boolean;
    confidence?: number;
    notes?: string;
  },
): ManagedKeyterm {
  return {
    id: managedId(keyterm.term),
    term: normalizeTerm(keyterm.term),
    boost: keyterm.boost,
    category: keyterm.category,
    source,
    notes: options?.notes ?? "",
    selected: options?.selected ?? true,
    pinned: options?.pinned ?? false,
    priority: 0,
    confidence: options?.confidence ?? 1,
    token_count: countTokens(keyterm.term),
  };
}

export function buildManagedKeyterms(args: {
  record: CaseRecord;
  provenance: FieldProvenanceRow[];
}): ManagedKeyterm[] {
  const harvested = harvestKeyterms(args.record, args.provenance);
  const byKey = new Map<string, ManagedKeyterm>();

  for (const suggestion of harvested) {
    const key = normalizeTerm(suggestion.term).toLowerCase();
    byKey.set(key, {
      id: managedId(suggestion.term),
      term: normalizeTerm(suggestion.term),
      boost: Math.min(1, suggestion.boost / 10),
      category: mapHarvestCategory(suggestion.category),
      source: mapHarvestSource(suggestion.source),
      notes: "",
      selected: true,
      pinned: false,
      priority: 0,
      confidence: Math.min(1, suggestion.boost / 10),
      token_count: countTokens(suggestion.term),
    });
  }

  for (const keyterm of args.record.deepgram.keyterms) {
    const key = normalizeTerm(keyterm.term).toLowerCase();
    const decoded = readStoredKeytermMeta(keyterm.notes ?? "");
    const existing = byKey.get(key);

    byKey.set(key, {
      id: existing?.id ?? managedId(keyterm.term),
      term: normalizeTerm(keyterm.term),
      boost: keyterm.boost,
      category: keyterm.category,
      source: decoded.source ?? existing?.source ?? "Manual",
      notes: decoded.notes ?? (!keyterm.notes.startsWith(KEYTERM_META_PREFIX) ? keyterm.notes : ""),
      selected: decoded.selected ?? existing?.selected ?? true,
      pinned: decoded.pinned ?? existing?.pinned ?? false,
      priority: 0,
      confidence: existing?.confidence ?? 1,
      token_count: countTokens(keyterm.term),
    });
  }

  return Array.from(byKey.values());
}

export function mergeManagedKeytermSuggestions(
  existingTerms: ManagedKeyterm[],
  suggestions: HarvestedKeyterm[],
): ManagedKeyterm[] {
  const merged = new Map<string, ManagedKeyterm>();

  for (const term of existingTerms) {
    merged.set(normalizeTerm(term.term).toLowerCase(), term);
  }

  for (const suggestion of suggestions) {
    const key = normalizeTerm(suggestion.term).toLowerCase();
    if (merged.has(key)) {
      continue;
    }
    merged.set(key, {
      id: managedId(suggestion.term),
      term: normalizeTerm(suggestion.term),
      boost: Math.min(1, suggestion.boost / 10),
      category: mapHarvestCategory(suggestion.category),
      source: mapHarvestSource(suggestion.source),
      notes: "",
      selected: true,
      pinned: false,
      priority: 0,
      confidence: Math.min(1, suggestion.boost / 10),
      token_count: countTokens(suggestion.term),
    });
  }

  return Array.from(merged.values());
}

export function serializeManagedKeyterms(terms: ManagedKeyterm[]): DeepgramKeyterm[] {
  return terms.map((term) => ({
    term: normalizeTerm(term.term),
    boost: term.boost,
    category: term.category,
    notes: encodeNotes({
      selected: term.selected,
      pinned: term.pinned,
      source: term.source,
      notes: term.notes,
    }),
  }));
}

export function mergeManagedDerivedKeyterms(
  existingTerms: ManagedKeyterm[],
  derivedKeyterms: DeepgramKeyterm[],
): ManagedKeyterm[] {
  const merged = new Map<string, ManagedKeyterm>();

  for (const term of existingTerms) {
    merged.set(normalizeTerm(term.term).toLowerCase(), term);
  }

  for (const keyterm of derivedKeyterms) {
    const dedupeKey = normalizeTerm(keyterm.term).toLowerCase();
    if (merged.has(dedupeKey)) {
      continue;
    }

    merged.set(dedupeKey, buildManagedTerm(keyterm, "UFM Metadata", {
      selected: true,
      pinned: false,
      confidence: 1,
      notes: keyterm.notes,
    }));
  }

  return Array.from(merged.values());
}

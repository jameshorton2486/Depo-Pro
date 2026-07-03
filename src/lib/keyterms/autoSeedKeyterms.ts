import type { CaseRecord, DeepgramKeyterm } from "../../types/case";

const AUTO_SEED_LIMIT = 20;
const AUTO_SEED_SOURCE = "Case Record";

export interface AutoSeedAudit {
  source: "case_record";
  added_terms: string[];
  already_present_terms: string[];
  dropped_for_cap_terms: string[];
  final_auto_seeded_terms: string[];
}

function normalizeTerm(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function fieldValue<T>(field: { value: T } | null | undefined): T | null {
  return field ? field.value : null;
}

function pushUnique(target: string[], seen: Set<string>, value: string | null | undefined) {
  const normalized = normalizeTerm(value ?? "");
  if (!normalized) {
    return;
  }

  const key = normalized.toLowerCase();
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  target.push(normalized);
}

function pushNameAndSurname(target: string[], seen: Set<string>, value: string | null | undefined) {
  const normalized = normalizeTerm(value ?? "");
  if (!normalized) {
    return;
  }

  pushUnique(target, seen, normalized);
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    pushUnique(target, seen, parts[parts.length - 1] ?? null);
  }
}

function toStoredAutoSeedKeyterm(term: string): DeepgramKeyterm {
  return {
    term,
    boost: 0.6,
    category: "proper_name",
    notes: `__depo_keyterm_meta__:${JSON.stringify({
      selected: true,
      pinned: false,
      source: AUTO_SEED_SOURCE,
      notes: "derived:auto-seed:case-record",
    })}`,
  };
}

export function deriveAutoSeedKeytermsFromCaseRecord(record: CaseRecord): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  for (const witness of record.witnesses) {
    pushNameAndSurname(candidates, seen, fieldValue(witness.name));
  }

  for (const attorney of record.attorneys) {
    pushNameAndSurname(candidates, seen, fieldValue(attorney.name));
  }

  pushUnique(candidates, seen, fieldValue(record.caption.case_number));
  pushNameAndSurname(candidates, seen, fieldValue(record.reporter.name));

  return candidates.slice(0, AUTO_SEED_LIMIT);
}

export function buildAutoSeedKeytermPlan(record: CaseRecord, manualKeyterms: DeepgramKeyterm[]): {
  autoSeededKeyterms: DeepgramKeyterm[];
  audit: AutoSeedAudit;
} {
  const manualTerms = new Set(
    manualKeyterms
      .map((keyterm) => normalizeTerm(keyterm.term).toLowerCase())
      .filter(Boolean),
  );

  const rawCandidates: string[] = [];
  const rawSeen = new Set<string>();

  for (const witness of record.witnesses) {
    pushNameAndSurname(rawCandidates, rawSeen, fieldValue(witness.name));
  }

  for (const attorney of record.attorneys) {
    pushNameAndSurname(rawCandidates, rawSeen, fieldValue(attorney.name));
  }

  pushUnique(rawCandidates, rawSeen, fieldValue(record.caption.case_number));
  pushNameAndSurname(rawCandidates, rawSeen, fieldValue(record.reporter.name));

  const alreadyPresentTerms: string[] = [];
  const addedTerms: string[] = [];
  const droppedForCapTerms: string[] = [];
  const finalTerms: string[] = [];

  for (const candidate of rawCandidates) {
    const key = candidate.toLowerCase();
    if (manualTerms.has(key)) {
      alreadyPresentTerms.push(candidate);
      continue;
    }

    if (finalTerms.length >= AUTO_SEED_LIMIT) {
      droppedForCapTerms.push(candidate);
      continue;
    }

    finalTerms.push(candidate);
    addedTerms.push(candidate);
  }

  return {
    autoSeededKeyterms: finalTerms.map(toStoredAutoSeedKeyterm),
    audit: {
      source: "case_record",
      added_terms: addedTerms,
      already_present_terms: alreadyPresentTerms,
      dropped_for_cap_terms: droppedForCapTerms,
      final_auto_seeded_terms: finalTerms,
    },
  };
}

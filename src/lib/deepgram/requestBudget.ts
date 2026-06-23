import type { DeepgramKeyterm } from "../../types/case.ts";
import { DEEPGRAM_KEYTERM_SOFT_TERM_CAP, DEEPGRAM_KEYTERM_SOFT_TOKEN_CAP, estimateSelectedStoredKeytermTokens } from "../keytermDerivation.ts";
import { readStoredKeytermMeta } from "../keyterms/managedKeyterms.ts";

export interface DeepgramBudgetFitResult {
  keyterms: DeepgramKeyterm[];
  estimatedTokens: number;
  droppedCount: number;
}

type RequestBudgetTier = "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";

type StoredKeytermBudgetEntry = {
  keyterm: DeepgramKeyterm;
  index: number;
  termTokens: number;
  tier: RequestBudgetTier;
};

function estimateTermTokens(term: string): number {
  return term.trim().split(/\s+/).filter(Boolean).length + 1;
}

function readDerivedOrigin(notes: string): string | null {
  if (!notes.startsWith("derived:")) {
    return null;
  }

  const [, origin = ""] = notes.split(":");
  return origin || null;
}

function looksLikeJurisdiction(term: string): boolean {
  return /\b(?:county|judicial district|district court|state of texas|court of)\b/i.test(term);
}

function looksLikeCaseIdentifier(term: string): boolean {
  return /\b(?:cause|case|exhibit|no\.?|number|cause number)\b/i.test(term) || /\b[A-Z]?\d{4,}[A-Z-]*\b/.test(term);
}

function looksLikeNamedEntity(term: string): boolean {
  return /^[A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+)*$/.test(term.trim());
}

function classifyRequestBudgetTier(keyterm: DeepgramKeyterm): RequestBudgetTier {
  const meta = readStoredKeytermMeta(keyterm.notes ?? "");
  const derivedNotes = meta.notes ?? "";
  const origin = readDerivedOrigin(derivedNotes);

  if (
    origin === "witness"
    || origin === "attorney"
    || origin === "expert"
    || (origin === "caption_entity" && (keyterm.category === "proper_name" || looksLikeNamedEntity(keyterm.term)))
    || keyterm.category === "proper_name"
  ) {
    return "TIER_1";
  }

  if (
    origin === "organization"
    || origin === "firm"
    || origin === "medical_provider"
    || (origin === "caption_entity" && keyterm.category === "company")
    || keyterm.category === "company"
  ) {
    return "TIER_2";
  }

  if (
    origin === "location"
    || looksLikeCaseIdentifier(keyterm.term)
    || looksLikeJurisdiction(keyterm.term)
    || keyterm.category === "location"
  ) {
    return "TIER_3";
  }

  return "TIER_4";
}

function compareBudgetEntries(a: StoredKeytermBudgetEntry, b: StoredKeytermBudgetEntry): number {
  const tierOrder: Record<RequestBudgetTier, number> = {
    TIER_1: 1,
    TIER_2: 2,
    TIER_3: 3,
    TIER_4: 4,
  };

  const tierDelta = tierOrder[a.tier] - tierOrder[b.tier];
  if (tierDelta !== 0) {
    return tierDelta;
  }

  return a.index - b.index;
}

export function fitStoredKeytermsToRequestBudget(keyterms: DeepgramKeyterm[]): DeepgramBudgetFitResult {
  const included: DeepgramKeyterm[] = [];
  const budgetEntries: StoredKeytermBudgetEntry[] = [];
  let estimatedTokens = 0;

  for (const [index, keyterm] of keyterms.entries()) {
    const meta = readStoredKeytermMeta(keyterm.notes ?? "");
    if (meta.selected === false) {
      continue;
    }

    budgetEntries.push({
      keyterm,
      index,
      termTokens: estimateTermTokens(keyterm.term),
      tier: classifyRequestBudgetTier(keyterm),
    });
  }

  budgetEntries.sort(compareBudgetEntries);

  for (const entry of budgetEntries) {
    if (
      included.length + 1 > DEEPGRAM_KEYTERM_SOFT_TERM_CAP
      || estimatedTokens + entry.termTokens > DEEPGRAM_KEYTERM_SOFT_TOKEN_CAP
    ) {
      continue;
    }

    included.push(entry.keyterm);
    estimatedTokens += entry.termTokens;
  }

  return {
    keyterms: included,
    estimatedTokens: estimateSelectedStoredKeytermTokens(included),
    droppedCount: keyterms.length - included.length,
  };
}


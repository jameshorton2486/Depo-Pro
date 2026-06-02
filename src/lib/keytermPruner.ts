// Keyterm pruning service — pure functions, no React, no side effects.
//
// Rules:
//   1. Pinned terms are NEVER removed.
//   2. Deselected (disabled) terms are excluded from pruning — they don't count
//      toward limits and are already inactive.
//   3. When selected count > MAX_TERMS or token total > MAX_TOKENS, deselect
//      the lowest-priority selected non-pinned terms until within limits.
//   4. Returns a new array; never mutates the input.

import type { ManagedKeyterm } from "../components/DeepgramKeytermManager/types";
import { rankKeyterms, totalTokens, selectedCount } from "./keytermRanker";

export const MAX_TERMS  = 100;
export const MAX_TOKENS = 500;

export interface PruneResult {
  terms: ManagedKeyterm[];
  deselected: string[];   // ids of terms that were deselected
  termLimit: boolean;     // true if term count was the binding constraint
  tokenLimit: boolean;    // true if token count was the binding constraint
}

// ─── Prune to limits ──────────────────────────────────────────────────────────
// Deselects lowest-priority non-pinned selected terms until both limits are met.
// Input should already be ranked (rankKeyterms).

export function pruneToLimits(terms: ManagedKeyterm[]): PruneResult {
  const deselected: string[] = [];
  let termLimit  = false;
  let tokenLimit = false;

  let working = terms.map((t) => ({ ...t }));

  while (
    selectedCount(working) > MAX_TERMS ||
    totalTokens(working) > MAX_TOKENS
  ) {
    if (selectedCount(working) > MAX_TERMS) termLimit = true;
    if (totalTokens(working) > MAX_TOKENS) tokenLimit = true;

    // Find the lowest-priority selected non-pinned term to deselect.
    // Working list is already sorted highest-priority first, so we reverse
    // to find the tail candidate.
    const candidate = [...working]
      .reverse()
      .find((t) => t.selected && !t.pinned);

    if (!candidate) break; // all remaining selected terms are pinned — cannot prune further

    working = working.map((t) =>
      t.id === candidate.id ? { ...t, selected: false } : t,
    );
    deselected.push(candidate.id);
  }

  return { terms: working, deselected, termLimit, tokenLimit };
}

// ─── Validate limits ──────────────────────────────────────────────────────────
// Non-destructive check — returns whether the current selection fits.

export interface LimitStatus {
  withinTermLimit:  boolean;
  withinTokenLimit: boolean;
  termCount:        number;
  tokenCount:       number;
  termOverage:      number;  // 0 if within limit
  tokenOverage:     number;  // 0 if within limit
}

export function checkLimits(terms: ManagedKeyterm[]): LimitStatus {
  const termCount  = selectedCount(terms);
  const tokenCount = totalTokens(terms);
  return {
    withinTermLimit:  termCount  <= MAX_TERMS,
    withinTokenLimit: tokenCount <= MAX_TOKENS,
    termCount,
    tokenCount,
    termOverage:  Math.max(0, termCount  - MAX_TERMS),
    tokenOverage: Math.max(0, tokenCount - MAX_TOKENS),
  };
}

// ─── Auto-select from candidates ─────────────────────────────────────────────
// Given a ranked list (some selected, some not), greedily select as many
// unselected non-pinned terms as possible without exceeding limits.

export function autoSelectCandidates(terms: ManagedKeyterm[]): ManagedKeyterm[] {
  const ranked = rankKeyterms(terms);
  const working = ranked.map((t) => ({ ...t }));

  for (const term of working) {
    if (term.selected || term.pinned) continue;

    const wouldTerms  = selectedCount(working) + 1;
    const wouldTokens = totalTokens(working) + term.token_count;

    if (wouldTerms <= MAX_TERMS && wouldTokens <= MAX_TOKENS) {
      term.selected = true;
    }
  }

  return working;
}

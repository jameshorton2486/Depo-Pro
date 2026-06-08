// Keyterm ranking service — pure functions, no React, no side effects.
//
// Priority score is computed from category, source, boost value, and
// pinned/selected state. Higher score = higher priority = kept first during pruning.

import type { ManagedKeyterm, KeytermSource } from "../components/DeepgramKeytermManager/types.ts";
import type { KeytermCategory } from "../types/case.ts";

// ─── Weights ──────────────────────────────────────────────────────────────────

const CATEGORY_WEIGHT: Record<KeytermCategory, number> = {
  proper_name: 10,
  company:      9,
  location:     8,
  legal_term:   7,
  technical:    6,
  other:        3,
};

const SOURCE_WEIGHT: Record<KeytermSource, number> = {
  "UFM Metadata":      10,
  "Notice":            9,
  "Scheduling Notes":  7,
  "Contact Library":   6,
  "Manual":            5,
  "Learned":           4,
};

// ─── Token counting ───────────────────────────────────────────────────────────
// Approximation: split on whitespace. Each word ≈ 1 token for Deepgram keyword params.
// Hyphenated terms count as 1 token each component.

export function countTokens(term: string): number {
  return term.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Priority score ───────────────────────────────────────────────────────────
// Returns a numeric score 0–100. Used for display sorting and pruning order.
// Pinned terms always get max score so they are never removed by the pruner.

export function computePriority(keyterm: Omit<ManagedKeyterm, "priority">): number {
  if (keyterm.pinned) return 100;

  const catScore    = CATEGORY_WEIGHT[keyterm.category] ?? 3;
  const srcScore    = SOURCE_WEIGHT[keyterm.source] ?? 5;
  const boostScore  = keyterm.boost * 10; // 0–10
  const confirmBonus = keyterm.confidence >= 0.8 ? 5 : keyterm.confidence >= 0.6 ? 2 : 0;

  // Weighted average → normalise to 0–100
  const raw = catScore * 0.35 + srcScore * 0.30 + boostScore * 0.25 + confirmBonus * 0.10;
  return Math.min(100, Math.round((raw / 10) * 100));
}

// ─── Re-rank a list in place ──────────────────────────────────────────────────
// Returns a new array with priority scores updated and sorted:
//   1. Pinned (priority 100) first
//   2. Selected before unselected
//   3. Higher priority score first
//   4. Alphabetical tiebreak

export function rankKeyterms(terms: ManagedKeyterm[]): ManagedKeyterm[] {
  const rescored = terms.map((t) => ({
    ...t,
    priority: computePriority(t),
    token_count: countTokens(t.term),
  }));

  return [...rescored].sort((a, b) => {
    // Pinned first
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    // Selected before unselected
    if (a.selected !== b.selected) return a.selected ? -1 : 1;
    // Priority desc
    if (b.priority !== a.priority) return b.priority - a.priority;
    // Alphabetical
    return a.term.localeCompare(b.term);
  });
}

// ─── Token total ──────────────────────────────────────────────────────────────

export function totalTokens(terms: ManagedKeyterm[]): number {
  return terms
    .filter((t) => t.selected)
    .reduce((sum, t) => sum + t.token_count, 0);
}

// ─── Selected count ───────────────────────────────────────────────────────────

export function selectedCount(terms: ManagedKeyterm[]): number {
  return terms.filter((t) => t.selected).length;
}

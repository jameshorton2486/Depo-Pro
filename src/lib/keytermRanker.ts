// Keyterm ranking service — pure functions, no React, no side effects.
//
// Priority score is computed from category, source, derived provenance, boost value, and
// pinned/selected state. Higher score = higher priority = kept first during pruning.

import type { ManagedKeyterm, KeytermSource } from "../components/DeepgramKeytermManager/types.ts";
import type { KeytermCategory } from "../types/case.ts";

const CATEGORY_WEIGHT: Record<KeytermCategory, number> = {
  proper_name: 10,
  company:      9,
  location:     8,
  legal_term:   4,
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

const DERIVED_ORIGIN_WEIGHT = {
  witness: 10,
  attorney: 9,
  expert: 8,
  organization: 7,
  firm: 6,
  medical_provider: 5,
  caption_entity: 4,
  legal_term: 1,
  other_person: 3,
  location: 2,
} as const;

type DerivedOrigin = keyof typeof DERIVED_ORIGIN_WEIGHT;

function readDerivedOrigin(notes: string): DerivedOrigin | null {
  if (!notes.startsWith("derived:")) {
    return notes === "derived" ? "other_person" : null;
  }

  const origin = notes.slice("derived:".length) as DerivedOrigin;
  return origin in DERIVED_ORIGIN_WEIGHT ? origin : null;
}

export function countTokens(term: string): number {
  return term.trim().split(/\s+/).filter(Boolean).length;
}

export function computePriority(keyterm: Omit<ManagedKeyterm, "priority">): number {
  if (keyterm.pinned) return 100;

  const catScore = CATEGORY_WEIGHT[keyterm.category] ?? 3;
  const srcScore = SOURCE_WEIGHT[keyterm.source] ?? 5;
  const boostScore = keyterm.boost * 10;
  const confirmBonus = keyterm.confidence >= 0.8 ? 5 : keyterm.confidence >= 0.6 ? 2 : 0;
  const originScore = DERIVED_ORIGIN_WEIGHT[readDerivedOrigin(keyterm.notes) ?? "other_person"];

  const raw = catScore * 0.25 + srcScore * 0.2 + originScore * 0.35 + boostScore * 0.1 + confirmBonus * 0.1;
  return Math.min(100, Math.round((raw / 10) * 100));
}

export function rankKeyterms(terms: ManagedKeyterm[]): ManagedKeyterm[] {
  const rescored = terms.map((t) => ({
    ...t,
    priority: computePriority(t),
    token_count: countTokens(t.term),
  }));

  return [...rescored].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.selected !== b.selected) return a.selected ? -1 : 1;
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.term.localeCompare(b.term);
  });
}

export function totalTokens(terms: ManagedKeyterm[]): number {
  return terms
    .filter((t) => t.selected)
    .reduce((sum, t) => sum + t.token_count, 0);
}

export function selectedCount(terms: ManagedKeyterm[]): number {
  return terms.filter((t) => t.selected).length;
}

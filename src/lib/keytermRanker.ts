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
  "Case Record":       10,
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

const MULTIWORD_SURNAME_PARTICLES = new Set(["de", "del", "la", "van", "von", "san", "st", "el"]);

type DerivedOrigin = keyof typeof DERIVED_ORIGIN_WEIGHT;

type DerivedNoteMeta = {
  origin: DerivedOrigin | null;
  qualifiers: string[];
};

function readDerivedNoteMeta(notes: string): DerivedNoteMeta {
  if (!notes.startsWith("derived:")) {
    return {
      origin: notes === "derived" ? "other_person" : null,
      qualifiers: [],
    };
  }

  const [, rawOrigin = "", ...qualifiers] = notes.split(":");
  const origin = rawOrigin in DERIVED_ORIGIN_WEIGHT ? rawOrigin as DerivedOrigin : null;
  return { origin, qualifiers };
}

function looksLikeOrganizationPhrase(term: string, origin: DerivedOrigin | null): boolean {
  if (origin !== "organization" && origin !== "firm") {
    return false;
  }

  return term.split(/\s+/).length >= 3 || term.includes("&");
}

function looksLikeMedicalCandidate(term: string, origin: DerivedOrigin | null): boolean {
  if (origin === "medical_provider") {
    return true;
  }

  return /(?:ology|otomy|scopy|vascular|ligament|cervical|lumbar|thoracic|neurology|radiology|orthopedic|surgery|clinic|hospital|medical|spine)/i.test(term);
}

function hasMultiWordSurname(term: string): boolean {
  const tokens = term.split(/\s+/).map((token) => token.replace(/[^A-Za-z'’-]/g, "")).filter(Boolean);
  if (tokens.length < 3) {
    return false;
  }

  return MULTIWORD_SURNAME_PARTICLES.has(tokens[tokens.length - 2].toLowerCase());
}

function hasUncommonSurnamePattern(term: string): boolean {
  const tokens = term.split(/\s+/).map((token) => token.replace(/[^A-Za-z'’-]/g, "")).filter(Boolean);
  const surname = tokens[tokens.length - 1] ?? "";
  if (surname.length < 6) {
    return false;
  }

  return /(?:[qxzj]|tz|cz|kh|gh|eaux|quez|yan|ian|ov|eva|tj|dj|mn)/i.test(surname);
}

function computeDifficultyBonus(keyterm: Omit<ManagedKeyterm, "priority">): number {
  const { origin, qualifiers } = readDerivedNoteMeta(keyterm.notes);
  let bonus = 0;

  if (qualifiers.includes("sbot")) {
    bonus += 0.2;
  }

  if (/[-'’]/.test(keyterm.term)) {
    bonus += 0.08;
  }

  if (/\b[A-Z]\./.test(keyterm.term)) {
    bonus += 0.05;
  }

  if (hasMultiWordSurname(keyterm.term)) {
    bonus += 0.08;
  }

  if (hasUncommonSurnamePattern(keyterm.term)) {
    bonus += 0.12;
  }

  if (looksLikeMedicalCandidate(keyterm.term, origin)) {
    bonus += 0.12;
  }

  if (looksLikeOrganizationPhrase(keyterm.term, origin)) {
    bonus += 0.08;
  }

  return Math.min(0.3, bonus);
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
  const originScore = DERIVED_ORIGIN_WEIGHT[readDerivedNoteMeta(keyterm.notes).origin ?? "other_person"];
  const difficultyBonus = computeDifficultyBonus(keyterm);

  const raw = catScore * 0.2 + srcScore * 0.15 + originScore * 0.45 + boostScore * 0.1 + confirmBonus * 0.1 + difficultyBonus;
  return Math.min(100, Number(((raw / 10) * 100).toFixed(2)));
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

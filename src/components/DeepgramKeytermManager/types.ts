// UI-layer types for the Deepgram Keyterm Manager.
// These are richer than the storage-layer DeepgramKeyterm from types/case.ts —
// they carry UI state (selected, pinned, source, token_count, confidence).

import type { KeytermCategory } from "../../types/case.ts";

// ─── Source ───────────────────────────────────────────────────────────────────

export type KeytermSource =
  | "Case Record"       // auto-seeded directly from case metadata before transcription
  | "UFM Metadata"       // auto-extracted from case caption, witness, attorney names
  | "Notice"             // parsed from the Notice of Deposition document
  | "Scheduling Notes"   // parsed from scheduling/job-sheet notes
  | "Contact Library"    // imported from the contact/firm database
  | "Manual"             // typed directly by the reporter
  | "Learned";           // from prior similar cases

// ─── Managed keyterm ─────────────────────────────────────────────────────────
// Extends the storage model with all UI-layer state.

export interface ManagedKeyterm {
  id: string;
  term: string;
  boost: number;           // 0.0–1.0
  category: KeytermCategory;
  source: KeytermSource;
  notes: string;
  // UI state
  selected: boolean;       // included in the Deepgram request
  pinned: boolean;         // immune to auto-pruning
  priority: number;        // 0–100, computed by ranker
  confidence: number;      // 0.0–1.0, source extraction confidence (1.0 for manual)
  token_count: number;     // word-count approximation
}

// ─── View tabs ────────────────────────────────────────────────────────────────

export type KeytermView = "all" | "selected" | "pinned" | "excluded";

// ─── Limit constants ──────────────────────────────────────────────────────────

export const DEEPGRAM_MAX_TERMS  = 100;
export const DEEPGRAM_MAX_TOKENS = 500;

// ─── Add form shape ───────────────────────────────────────────────────────────

export interface AddKeytermForm {
  term: string;
  boost: number;
  category: KeytermCategory;
  source: KeytermSource;
  notes: string;
}

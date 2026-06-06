// All contract types live in src/api/types.ts.
// This barrel re-exports them for backwards compatibility with internal imports.
export type * from "../api/types";

// ─── UI-only types (not part of the API contract) ───────────────────────────

import type { UtteranceId, WordId } from "../api/types";

export type ChangeSource = "editor" | "suggestion-accept" | "suggestion-edit";

export interface ChangeLogEntry {
  change_id: string;
  timestamp: number;
  utterance_id: UtteranceId;
  word_id: WordId | null;
  old_text: string;
  new_text: string;
  source: ChangeSource;
  suggestion_id?: string;
}

export interface DepoEditorConfig {
  jobId?: string;
  apiBaseUrl: string;
  mountSelector: string;
  readOnly?: boolean;
  supabaseAccessToken?: string;
  supabaseRefreshToken?: string;
}

// ─── UFM Case model (UI-only — not part of the API contract) ─────────────────
export type * from "./case";

// ─── Contact library ─────────────────────────────────────────────────────────
export type * from "./contact";

// ─── IntakeData — thin form shape used by IntakeScreen ───────────────────────
// Subset of CaseRecord fields flattened for the intake form UI.
// The IntakeScreen will be migrated to CaseRecord directly in a future pass.
export interface IntakeData {
  caseName: string;
  caseNumber: string;
  court: string;
  deponentName: string;
  deponentRole: "WITNESS" | "PARTY" | "EXPERT" | "OTHER";
  depositionDate: string;
  location: string;
  examiningAttorney: string;
  opposingAttorney: string;
  reporterName: string;
  reporterCertNumber: string;
  notes: string;
}

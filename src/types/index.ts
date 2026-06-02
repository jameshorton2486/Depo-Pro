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
  jobId: string;
  apiBaseUrl: string;
  mountSelector: string;
  readOnly?: boolean;
}

// UI-only — not part of the API contract. Captured at intake and held in local
// state until a future "submit job" endpoint is wired.
export interface IntakeData {
  caseName: string;
  caseNumber: string;
  court: string;
  deponentName: string;
  deponentRole: "WITNESS" | "PARTY" | "EXPERT" | "OTHER";
  depositionDate: string;   // ISO date string "YYYY-MM-DD"
  location: string;
  examiningAttorney: string;
  opposingAttorney: string;
  reporterName: string;
  reporterCertNumber: string;
  notes: string;
}

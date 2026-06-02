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

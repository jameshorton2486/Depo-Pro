# PROMPT 3 — Close the AI auto-apply audit-trail gap

**Context.** In `supabase/functions/ai-review/index.ts`, when `suggestion.auto_apply` is true the function writes `working_text` and sets `ai_suggestion_status = "accepted"` but writes no row to `transcript_audit_log`. The manual path in `editor-api/index.ts` does append audit rows. Automated edits therefore bypass the append-only audit trail.

**Task.**
1. For every auto-applied word suggestion in `ai-review`, append a `transcript_audit_log` row mirroring the manual accept shape: `source: "ai_review"`, `action: "ai_suggestion_auto_applied"`, `word_id`, `utterance_id`, `old_text`, `new_text`, `before_text`, `after_text`, and confidence if the schema already supports it.
2. Keep the audit insert in the same logical unit as the word update. If the audit insert fails, surface that failure and reflect it in `ai_review_meta`; do not silently succeed.
3. Reconcile the 0.92 auto-apply threshold with product intent. If all AI edits should require human review, add a config flag with auto-apply off by default and document the decision in `ARCHITECTURE_DECISIONS.md`.

**Acceptance / verification.**
1. Add unit coverage for both branches: auto-apply produces a `working_text` write plus an audit row; non-auto-apply leaves `working_text` untouched and status `pending`.
2. Confirm `supabase/functions/ai-review/index.ts` now references `transcript_audit_log` in the auto-apply path.
3. Run `npm run typecheck`, `npm test`, and report the commit hash.

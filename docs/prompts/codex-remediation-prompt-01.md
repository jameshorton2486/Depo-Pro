# PROMPT 1 — Fix `speaker_resolution_current` schema/read mismatch

**Context.** `supabase/functions/ai-review/index.ts` builds the AI reviewer's speaker input by reading `speaker_resolution_current` with `select("*")` (line ~71), then maps fields including `display_name` and `verified_role` (lines ~106–107). Those two columns do not exist on `speaker_resolution_current`. The table defined in migration `supabase/migrations/20260627213000_add_pipeline_state_and_speaker_resolution.sql` has: `speaker_id, proposed_display_name, proposed_role, confidence, evidence, authority, ai_suggested, verified` plus timestamps. The human-verified identity actually lives on `transcript_speakers` (`display_name`, `assigned_name`, `speaker_role`, `role`). Because the read maps non-existent columns, `display_name` and `verified_role` are always `null`, so the AI reviewer never sees confirmed speaker labels and roles.

Separately, `DATA_REALITY_FINDINGS.md` documents a different stale schema for this table and references a `speaker_resolution_history` table that no migration creates. Reconcile the doc to the shipped migration; do not invent the history table unless a separate approved prompt adds it.

**Task.**
1. In `supabase/functions/ai-review/index.ts`, stop reading verified identity from `speaker_resolution_current`. Join or look up the verified name and role from `transcript_speakers` for the same `transcript_id`, and feed those into `buildAISuggestionInput`'s `speakers[].display_name` and `speakers[].verified_role`. Keep `proposed_display_name`, `proposed_role`, and `ai_suggested` coming from `speaker_resolution_current`.
2. Replace `select("*")` on `speaker_resolution_current` with an explicit column list matching the real migration schema, so future schema drift fails loudly instead of silently returning nulls.
3. Update `DATA_REALITY_FINDINGS.md` to describe the real `speaker_resolution_current` columns and annotate the non-existent `speaker_resolution_history` references as not implemented.

**Acceptance / verification.**
1. Add a `.test.ts` that constructs a `buildAISuggestionInput` speakers array from a fake `transcript_speakers` row plus a fake `speaker_resolution_current` row and asserts verified `display_name` and `verified_role` come from `transcript_speakers`, while `proposed_*` come from `speaker_resolution_current`.
2. Confirm there is no `select("*")` left in `supabase/functions/ai-review/index.ts`.
3. Run `npm run typecheck`, `npm test`, and report the commit hash.

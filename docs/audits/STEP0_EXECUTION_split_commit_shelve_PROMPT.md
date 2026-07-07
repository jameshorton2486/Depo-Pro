DEPO-PRO — STEP 0 (execution): split, commit, and shelve per approved plan
Branch: `feature/stage3-workspace-core`
Freeze: `BETA_FREEZE` active
Stack: Vite + React + TypeScript + Supabase Edge Functions (Deno) + PostgreSQL
Mode: staging / branch / commit only

Approved plan

LAND
- `AUTH-SESSION-MOUNT`
- `SAVE-PATH-HARDENING`
- `KEYTERM-AUTOSEED-COMPLIANCE`
- `INCLUSION-PAGES (W22-2)`
- `DOCS-WAVE22`
- `DOCS-QA`
- `DOCS-REDUNDANT` (remove superseded placeholder)

SHELVE → `wip/pre-w22-features`
- `EXPORT-ACTIVATION`
- `TAB-STOPS`
- `VIRTUALIZATION`
- `API-CLIENT-COMPLIANCE`
- `STAGE4-5-WORKFLOW`

Ignore for now
- `transcript_formatter/UsersjamesAppDataLocalTempdepo_pytest/`

SAFETY NET FIRST
Before any staging:

1. Create a full backup stash including untracked files, then immediately re-apply it:
   `git stash push -u -m "step0-backup-$(Get-Date -Format yyyyMMdd-HHmmss)" ; git stash apply`
2. Report the created stash ref.
3. Do not drop that stash automatically at the end.

ORDER OF OPERATIONS

STEP A — SHELVE deferred scopes first
Purpose: remove feature-only work from the active tree so LAND commits stay clean.

1. Create the shelf branch:
   `git branch wip/pre-w22-features`

2. Move ONLY these scopes onto the shelf branch:
   - `EXPORT-ACTIVATION`
   - `TAB-STOPS`
   - `VIRTUALIZATION`
   - `API-CLIENT-COMPLIANCE`
   - `STAGE4-5-WORKFLOW`

3. Use `git add -p` anywhere a file spans both LAND and SHELVE scopes.
   Known multi-scope files:
   - `src/api/workspaceService.ts`
   - `src/components/ExportScreen/ExportScreen.tsx`
   - `src/components/ExportScreen/ExportScreen.test.tsx`
   - `src/components/TranscriptEditor/TranscriptEditor.tsx`
   - `src/lib/transcriptDownloads.ts`
   - `src/lib/transcriptDownloads.test.ts`

4. If any hunk cannot be cleanly attributed to LAND or SHELVE, STOP and report,
   except for the known `INCLUSION-PAGES` vs `TAB-STOPS` / `VIRTUALIZATION` overlap risk
   in `src/components/TranscriptEditor/TranscriptEditor.tsx`.
   Fallback rule for that file only:
   - preserve `INCLUSION-PAGES` as the higher-priority LAND scope
   - if a shelved hunk is truly inseparable from an inclusion-pages hunk, land that
     combined hunk with the inclusion-pages commit rather than risking data loss or a
     broken partial split
   - report exactly which extra tab-stop / virtualization hunk remained on the main branch
     so post-beta recovery can account for it

5. After shelving, report `git status`.

STEP B — LAND the approved scopes, one atomic commit per scope

After EACH commit, run:
- `npx tsc --noEmit -p tsconfig.app.json`
- `npm run build`

If either fails, STOP immediately. Do not continue to the next commit.

Commit order:

1. `AUTH-SESSION-MOUNT`
   Files:
   - `src/main.tsx`
   Commit:
   - `fix: prevent forced-login redirect loop on editor mount (HTTP 431)`

2. `SAVE-PATH-HARDENING`
   Files:
   - `src/api/client.ts` (JSON error-detail hunk only; required so 409 overflow responses
     surface a user-legible message in real API mode)
   - `src/api/workspaceService.ts` (overflow-guard hunks only)
   - `src/lib/transcript/workingTextPersistence.ts`
   - `src/lib/transcript/workingTextPersistence.test.ts`
   - `src/mocks/handlers.ts` (overflow/save validation hunks only)
   - `supabase/functions/editor-api/index.ts` (overflow/save validation hunks only)
   Commit:
   - `fix: working-text overflow guard on save path`

3. `KEYTERM-AUTOSEED-COMPLIANCE`
   Files:
   - `src/components/DeepgramKeytermManager/DeepgramKeytermManager.tsx`
   Commit:
   - `fix: keep deepgram auto-seed tracking in memory only`

4. `INCLUSION-PAGES (W22-2)`
   Files:
   - `src/lib/transcript/inclusionPages.ts`
   - `src/api/workspaceService.ts` (`inclusionPages` load/plumbing hunks only)
   - `src/context/DocumentContext.tsx`
   - `src/context/DocumentContext.test.ts`
   - `src/lib/transcriptDownloads.ts` (inclusion-page hunks only)
   - `src/lib/transcriptDownloads.test.ts` (inclusion-page hunks only)
   - `src/components/ExportScreen/ExportScreen.tsx` (inclusion-page hunks only)
   - `src/components/ExportScreen/ExportScreen.test.tsx` (inclusion-page hunks only)
   - `src/components/TranscriptEditor/TranscriptEditor.tsx` (inclusion-page hunks only,
     except fallback overlap handling described above if a hunk is inseparable)
   Commit:
   - `feat(w22-2): inclusion-page front matter formatter and wiring`

5. `DOCS-WAVE22`
   Files:
   - `docs/audits/DUP_OPENING_AUDIT_2026-07-06.md`
   - `docs/audits/STEP0_TASK1b1c_worktree_triage_PROMPT.md`
   - `docs/audits/STEP0_EXECUTION_split_commit_shelve_PROMPT.md`
   - `docs/audits/W22-1_CANONICAL_INTAKE_PIPELINE_PROMPT.md`
   - `docs/audits/W22-1_IMPLEMENTATION_PROMPT_TIGHTENED.md`
   - `docs/audits/W22-2_METADATA_SPEAKER_STRUCTURE_PROMPT.md`
   - `docs/audits/W22-3_DETERMINISTIC_CORRECTION_AUDIT_2026-07-06.md`
   - `docs/audits/W22-3_DETERMINISTIC_CORRECTION_ENGINE_PROMPT.md`
   - `docs/audits/W22-3_IMPLEMENTATION_PROMPT_TIGHTENED_2026-07-06.md`
   - `docs/audits/W22-4_CANONICAL_PUNCTUATION_ENGINE_PROMPT.md`
   - `docs/audits/W22-5_AI_CONTEXT_ENGINE_PROMPT.md`
   - `docs/audits/W22-6_WORKSPACE_STAGE_S_EXPORT_ALIGNMENT_PROMPT.md`
   - `docs/audits/WAVE22_PRE_WORKSPACE_PROCESSING_AUDIT_2026-07-06.md`
   - `docs/audits/Wave22_Runbook.md`
   Commit:
   - `docs: add wave 22 audits prompts and runbook`

6. `DOCS-QA`
   Files:
   - `docs/qa/LARGE_TRANSCRIPT_AND_EXPORT_CHECKLIST.md`
   Commit:
   - `docs: add large-transcript and export QA checklist`

7. `DOCS-REDUNDANT`
   Files:
   - remove `docs/audits/W22-.txt`
   Commit:
   - `docs: remove superseded wave 22 runbook draft`

STEP C — VERIFY NOTHING WAS LOST

1. Report:
   - `git status`
   - `git log --oneline -8` on `feature/stage3-workspace-core`
   - `git log --oneline -8` on `wip/pre-w22-features`
2. Confirm the backup stash still exists.
3. Do not drop the stash automatically.
4. Leave `transcript_formatter/UsersjamesAppDataLocalTempdepo_pytest/` untouched and uncommitted.

CONSTRAINTS
- No code changes of any kind.
- Every commit must contain exactly one scope.
- If a scope does not build in isolation, STOP and report rather than forcing it.
- Do not push.
- Do not discard any change.

DELIVERABLE
- final `git status`
- commit list on `feature/stage3-workspace-core`
- commit list on `wip/pre-w22-features`
- backup stash ref, still present
- any scope or hunk that could not be separated cleanly

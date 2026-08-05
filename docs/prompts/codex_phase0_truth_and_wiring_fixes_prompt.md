# Codex CLI Prompt — Phase 0: Truth & Wiring Fixes (Intake)

Copy everything below the line into Codex CLI from the root of the repository.

---

Implement four small, surgical fixes identified by the intake audits (docs/audits/INTAKE_SCREEN_AUDIT.md, docs/audits/INTAKE_REAL_VS_MOCK_AUDIT.md). These are truth-and-wiring fixes only — NO new fields, NO UI redesign, NO new features beyond what is specified. Keep diffs minimal. `npm run build` must pass at the end. Report files changed per fix.

## Fix 1 — Wire ADD_ATTORNEY (broken empty-state add)

Per docs/audits/INTAKE_SCREEN_AUDIT.md: the attorney picker's empty state routes to `handleSelect("attorney", ...)` (IntakeScreen.tsx ~556-592, ~697-702), but `handleSelect` has no `attorney` branch, so `ADD_ATTORNEY` is unreachable and selecting/creating an attorney from the empty state silently does nothing.

- Add the `attorney` branch to `handleSelect`, mapping a selected/created Contact into the attorney shape the reducer expects (`name`, `firm` from organization, `email`, `phone`; `role`/`representing`/`bar_number` null/defaults consistent with existing UPDATE_ATTORNEY mapping at ~594-608) and dispatching `addAttorney`.
- The existing "Create new" inline form flow must work for attorneys exactly as it does for interpreters/videographers (create contact → 201 → card appears → included in next save). If the create-new form is currently not offered for the attorney picker, enable it using the same component path — no new components.

## Fix 2 — Make the Gate 1 / readiness indicators tell the truth

Per the audit, three indicators currently lie:

1. **"Audio file uploaded"** is hardcoded `false` (IntakeScreen.tsx ~1055-1068). Until durable audio storage exists (a later phase), the line must not present as a live status. Change it to read from `!!record.audio` (the only durable signal that exists), and relabel the line "Audio attached to case" so it is truthful about what it measures. Add a code comment: `// TODO Phase 3: durable storage-backed audio_uploaded + separate transcript_generated state`.
2. **"Case record created"** currently means `!!record.caption.case_name.value`. Make it mean what it says: track whether a Supabase row actually exists for this case — set a `persisted` boolean true when hydration loads a row OR when a save succeeds, and drive the checklist line from that. Keep it local to IntakeScreen state/refs; no reducer changes required if simpler.
3. **"Ready to proceed" banner** ignores unconfirmed fields. Add unconfirmed-field awareness: compute the count of visible extracted fields with `confirmed: false`, and when > 0, the banner must not show the fully-green "Ready to proceed" state — show an intermediate state (e.g., "N fields awaiting confirmation") using existing banner styling patterns. Do not change the underlying reducer validation in this phase.

## Fix 3 — Remove pre-confirmed extracted values from the mock seed

Per the audit's human-in-the-loop finding: `mockCaseRecord` ships multiple `source: "extracted"` fields with `confirmed: true` (mockRecord.ts ~21-24, ~29-37, ~68-72, ~80-85), so the screen boots with extracted values already confirmed without any human action.

- In `src/components/ExtractedFieldsTable/mockRecord.ts`, set `confirmed: false` on every field whose `source` is `"extracted"` (or `"imported"` where it represents an unreviewed extraction). Manual-source fields may remain confirmed.
- Result: a fresh DEV boot shows extracted fields awaiting confirmation, exercising the real confirm flow.
- Do not change reducer logic — the audit confirmed no runtime auto-accept path exists; this is purely seed data.

## Fix 4 — Honest placeholder buttons

- "View UFM Payload" (IntakeScreen.tsx ~922-929) is a placeholder advertising a capability that does not exist. Disable the button and add a small "Not yet implemented" affordance (tooltip or muted helper text) consistent with existing styles. Do not remove it — it documents intent.
- Leave the Deepgram keyterm manager and request preview in place — moving them to Transcript Creation is a later phase (Screen Ownership Cleanup). No changes to them now.

## Constraints

- No new dependencies, no schema changes, no new reducer actions unless Fix 1 strictly requires none anyway (it should not — `ADD_ATTORNEY` exists).
- Follow the existing ref-based pattern for any state read inside async or event callbacks (recordRef / dirtyRef precedent at ~973-984).
- After implementing, run `npm run build` and report: files changed per fix, and any place where the implementation deviated from this spec and why.

## Verification checklist (report results)

1. Attorney empty-state: select an existing contact → card appears → Save → contact present in `payload.attorneys` (query the live `cases` row to confirm).
2. Attorney create-new: create a contact via inline form → 201 → card appears → Save → present in payload.
3. Fresh DEV boot with no saved row: extracted fields show unconfirmed; banner shows fields awaiting confirmation; checklist does not claim a case record exists until a save succeeds.
4. After a successful save: "Case record created" turns true.

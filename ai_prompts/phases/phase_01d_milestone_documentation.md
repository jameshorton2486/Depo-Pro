# ═══════════════════════════════════════════════════════════════════════════════
# DEPO-PRO — PHASE 1D: MILESTONE DOCUMENTATION & SIGN-OFF
# Autonomous Documentation Prompt for Codex CLI / Claude Code
#
# Save to:  ai_prompts/phases/phase_01d_milestone_documentation.md
# Session:  claude code --no-resume
# Run:      AFTER phase_01c_ui_formatter_trigger.md completes
# Version:  1.0 — Self-Contained
#
# This prompt writes the Phase 1 completion record, signs off the milestone,
# and prepares the repository context for Phase 2 execution.
#
# It creates documentation only. No application code. No commits except
# for the documentation files themselves.
#
# Exit criterion: ai_logs/phase1_completion.md written and accurate.
# ═══════════════════════════════════════════════════════════════════════════════

---

## MISSION

Document the Phase 1 milestone formally.

This is the official sign-off step for Phase 1. It:

1. Reads the outputs from the previous three sessions (1A, 1B, 1C)
2. Gathers final test results and build status
3. Audits all Phase 1 files with their git commit hashes
4. Writes the completion record to `ai_logs/phase1_completion.md`
5. Updates `CLAUDE.md` to reflect that Phase 1 is complete
6. Creates `ai_logs/phase2_context.md` as the context handoff for Phase 2

This session makes exactly three commits — one per documentation file.

---

## EMBEDDED PLATFORM CONTEXT

**Current phase:** Phase 1 — Transcript Formatter Pipeline
**Next phase:** Phase 2 — Transcript Editor (interactive review interface)
**Phase 2 prompt:** `ai_prompts/phases/phase_02_transcript_editor.md` (exists)

**Phase 2 will implement:**
- Three-panel review page (audio player + transcript + flagged word panel)
- Optimistic locking on flagged word corrections (HTTP 409 on conflict)
- Consistency engine (pg_trgm similarity for proper noun variants)
- Date conflict detector (transcript dates vs. case incident_date)
- Phase B database migrations (reporter_preferences, proofreading_assignments,
  transcript_access_log, ai_rules, export_certifications)

**Non-negotiable platform rules:**
- `profiles` table — never `users`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — never ANON_KEY
- `THE REPORTER:` — never `THE COURT REPORTER:`
- Em dash → double hyphen in all transcript output
- `transcript_words.original_word` is immutable — never modify

---

## STEP 1 — GATHER PHASE 1 OUTPUTS

Read the following files to build the completion record:

```
ai_logs/preflight.md            (from Phase 1A)
ai_logs/phase1_validation.md    (from Phase 1B)
ai_logs/phase1c_audit.md        (from Phase 1C, if it exists)
```

If any of these files are missing, note that in the completion record
but do not stop — gather what is available.

Run a final snapshot of all checks:

```bash
npx tsc --noEmit 2>&1 | tail -3
npm run lint 2>&1 | tail -3
npx vitest run tests/integration/formatter-pipeline.test.ts 2>&1 | tail -10
npx vitest run 2>&1 | tail -5
```

Record actual results — do not assume they match the Phase 1B report.

---

## STEP 2 — AUDIT PHASE 1 FILES WITH GIT HASHES
**Commit:** `docs(phase1): write Phase 1 completion record`

Run `git log --oneline` to retrieve commit history.
For each Phase 1 file below, record its commit hash.

```bash
git log --oneline --follow lib/transcription/formatter/types.ts
git log --oneline --follow lib/transcription/formatter/section-detector.ts
git log --oneline --follow lib/transcription/formatter/paragraph-builder.ts
git log --oneline --follow lib/transcription/formatter/post-processor.ts
git log --oneline --follow lib/transcription/formatter/paginator.ts
git log --oneline --follow lib/transcription/formatter/quality-gate.ts
git log --oneline --follow lib/transcription/formatter/inclusion-pages.ts
git log --oneline --follow lib/transcription/formatter/docx-assembler.ts
git log --oneline --follow lib/transcription/formatter/index.ts
git log --oneline --follow app/api/transcriptions/[id]/format/route.ts
git log --oneline --follow components/transcripts/FormatterTrigger.tsx
```

---

## STEP 3 — WRITE COMPLETION RECORD

Create: `ai_logs/phase1_completion.md`

```markdown
# Depo-Pro — Phase 1 Completion Record
# Transcript Formatter Pipeline

**Status:** COMPLETE
**Completed:** [DATE]
**Phase 1 start:** [DATE from preflight.md or earliest Phase 1 commit]
**Total duration:** [calculated]

---

## Exit Criterion

Olivarez integration test: [PASSED / FAILED]

All assertions:
[List each integration test assertion with PASS / FAIL]

---

## Final Build Gate

| Check | Result |
|---|---|
| TypeScript errors | [count] |
| Lint errors | [count] |
| Production build | [PASSING / FAILING] |
| Unit tests | [NN / NN passing] |
| Integration test | [PASSED / FAILED] |

---

## Formatter Modules Created

| File | Commit Hash | Purpose |
|---|---|---|
| lib/transcription/formatter/types.ts | [hash] | All TypeScript interfaces |
| lib/transcription/formatter/section-detector.ts | [hash] | Section identification |
| lib/transcription/formatter/paragraph-builder.ts | [hash] | Q/A and colloquy grouping |
| lib/transcription/formatter/post-processor.ts | [hash] | Text normalization |
| lib/transcription/formatter/paginator.ts | [hash] | 25-line Texas UFM pagination |
| lib/transcription/formatter/quality-gate.ts | [hash] | 12-check pre-export gate |
| lib/transcription/formatter/inclusion-pages.ts | [hash] | Title, appearances, certification |
| lib/transcription/formatter/docx-assembler.ts | [hash] | DOCX generation |
| lib/transcription/formatter/index.ts | [hash] | Pipeline orchestrator |
| app/api/transcriptions/[id]/format/route.ts | [hash] | POST endpoint |
| components/transcripts/FormatterTrigger.tsx | [hash] | UI trigger component |

---

## Test Results

### Unit Tests

| File | Tests Passing | Tests Failing |
|---|---|---|
| post-processor.test.ts | [N] | [N] |
| section-detector.test.ts | [N] | [N] |
| paragraph-builder.test.ts | [N] | [N] |
| paginator.test.ts | [N] | [N] |
| quality-gate.test.ts | [N] | [N] |
| FormatterTrigger.test.tsx | [N] | [N] |

### Integration Test

| Assertion | Result |
|---|---|
| Fixture loads and contains words | PASS / FAIL |
| Miyamardeau misrecognition present (confidence < 0.50) | PASS / FAIL |
| Post-processor removes all em dashes | PASS / FAIL |
| Post-processor normalizes THE COURT REPORTER | PASS / FAIL |
| Post-processor normalizes 2:12 PM → 2:12 p.m. | PASS / FAIL |
| Paginator enforces 25-line limit | PASS / FAIL |
| Paginator starts page numbering at 1 | PASS / FAIL |
| Section detector identifies DIRECT EXAMINATION | PASS / FAIL |
| DOCX assembler returns Buffer > 1,000 bytes | PASS / FAIL |
| No em dash in final output | PASS / FAIL |
| No THE COURT REPORTER in final output | PASS / FAIL |

---

## Quality Gate Status

All 12 checks implemented:

| Code | Severity | Status |
|---|---|---|
| QG-001 | ERROR | [ACTIVE / STUB] |
| QG-002 | ERROR | [ACTIVE / STUB] |
| QG-003 | ERROR | [ACTIVE / STUB] |
| QG-004 | ERROR | [ACTIVE / STUB] |
| QG-005 | ERROR | [ACTIVE / STUB] |
| QG-006 | ERROR | [ACTIVE / STUB] |
| QG-007 | ERROR | [ACTIVE / STUB] |
| QG-008 | WARNING | [ACTIVE / STUB] |
| QG-009 | WARNING | [ACTIVE / STUB] |
| QG-010 | WARNING | [ACTIVE / STUB] |
| QG-011 | WARNING | [ACTIVE / STUB] |
| QG-012 | WARNING | [ACTIVE / STUB] |

---

## Known Limitations & Deferred Items

[Document any functionality that was noted as incomplete or deferred
during Phase 1 — stubs, TODOs, skipped test assertions, etc.]

---

## DOCX Validation (Manual Inspection)

[To be completed manually — see ai_prompts/phases/phase_01d_milestone_documentation.md
Section 4 for the inspection checklist]

---

## Phase 1 Sign-Off

All automated checks pass.
Exit criterion is met.
Phase 1 is formally complete.

Phase 2 is authorized to begin.
Prompt: ai_prompts/phases/phase_02_transcript_editor.md
```

---

## STEP 4 — DOCX MANUAL INSPECTION CHECKLIST

Create: `ai_logs/docx_inspection_checklist.md`

This checklist must be completed manually by opening the generated DOCX
in Microsoft Word or LibreOffice Writer before Phase 2 begins.

```markdown
# Depo-Pro — DOCX Output Inspection Checklist
# Complete this manually before signing off on Phase 1.

## Instructions

1. Trigger the formatter via the UI (Run Formatter button on a real job)
   OR via: POST /api/transcriptions/[id]/format
2. Download the export from /api/transcriptions/[id]/export
3. Open the DOCX file in Microsoft Word or LibreOffice Writer
4. Check each item below and mark PASS or FAIL

## Formatting Requirements

- [ ] Font family: Courier New throughout all body text
- [ ] Font size: 12pt (not 10pt, not 11pt)
- [ ] Page size: 8.5" × 11" US Letter (not A4 — verify in Page Setup)
- [ ] Left margin: 1.0 inch
- [ ] Right margin: 0.375 inch (verify: File → Page Setup → Margins)
- [ ] Lines per page: maximum 25 — count manually on a mid-document page
- [ ] Line numbers: present in left gutter, 1–25, reset each page
- [ ] Q. label: indented 5 spaces from left margin
- [ ] Q. text: starts 10 spaces from left margin
- [ ] A. label: indented 5 spaces from left margin
- [ ] A. text: starts 10 spaces from left margin
- [ ] Colloquy speaker label + text: starts 15 spaces from left margin

## Content Requirements

- [ ] Page header: case name, right-aligned, appears on page 2 onward
- [ ] Page footer: "- X -" centered with dynamic page number
- [ ] Reporter label: THE REPORTER: — not THE COURT REPORTER:
- [ ] Em dashes: none present — search "—" (U+2014) in Find & Replace
- [ ] Time format: "2:12 p.m." — not "2:12 PM" or "2:12pm"
- [ ] Appearance page: present as first page before transcript body
- [ ] Index of examinations: present
- [ ] Certification page: present as last page

## Overall Assessment

- [ ] PASS — DOCX meets legal transcript formatting standards
- [ ] FAIL — document specific failures below

## Failures (if any)

[Document any failures here before proceeding to Phase 2]
```

**Commit:** `docs(phase1): add DOCX inspection checklist`

---

## STEP 5 — UPDATE CLAUDE.md
**Commit:** `docs(phase1): update CLAUDE.md with Phase 1 status and Phase 2 context`

Update the `CLAUDE.md` file in the repository root.

Locate the section describing phases or current work.
Add or update:

```markdown
## Phase Status

### Phase 1 — Transcript Formatter Pipeline
**Status: COMPLETE**
Completed: [DATE]

Formatter modules: lib/transcription/formatter/ (9 files)
API endpoint: app/api/transcriptions/[id]/format/route.ts
UI trigger: components/transcripts/FormatterTrigger.tsx
Exit criterion: Olivarez integration test — PASSED
Quality gate: 12 checks active (QG-001 through QG-012)

### Phase 2 — Transcript Editor
**Status: READY TO BEGIN**
Prompt: ai_prompts/phases/phase_02_transcript_editor.md

Phase 2 requires: Phase 1 exit criterion PASSED (confirmed above)

Phase 2 implements:
- Phase B database migrations (reporter_preferences, proofreading_assignments,
  transcript_access_log, ai_rules, export_certifications)
- useEditorState hook (hooks/useEditorState.ts)
- AudioPlayer component with keyboard shortcuts (Space/arrows/F7/F9)
- TranscriptPanel with word-level audio sync and binary search O(log n)
- FlaggedWordPanel with keyboard navigation
- Correction API with optimistic locking (HTTP 409 on conflict)
- Consistency engine (pg_trgm similarity for proper noun variants)
- Date conflict detector
- Three-panel review page layout
```

---

## STEP 6 — WRITE PHASE 2 CONTEXT HANDOFF

Create: `ai_logs/phase2_context.md`

```markdown
# Depo-Pro — Phase 2 Context Handoff
# Read this at the start of the Phase 2 Codex session.

## What Phase 1 Built

The formatter pipeline converts Deepgram word-level output into
structured, paginated, legally formatted transcript paragraphs.

Key outputs used by Phase 2:
- `transcript_paragraphs` table: populated by formatter, read by editor
- `transcript_words` table: word-level with start/end timestamps for audio sync
- `flagged_words` table: low-confidence words (confidence < 0.70 = CRITICAL)
- `confidence_class` generated column on `transcript_words`
- POST /api/transcriptions/[id]/format: triggers formatter pipeline
- `FormatterTrigger` component: already in review page

## Phase 2 Database Requirements

Phase B migrations must be applied before Phase 2 code runs.

Required tables (may already exist — check before migrating):
- `reporter_preferences` — stores playback speed, foot pedal config
- `proofreading_assignments` — locks transcript to one scopist at a time
- `transcript_access_log` — audit trail of who opened/edited transcript
- `ai_rules` — seeded rule set for AI suggestion engine
- `export_certifications` — records each export event with QG results

Migration file to create:
`supabase/migrations/20260311_016_phase_b_editor.sql`

## Phase 2 File Targets

New files Phase 2 creates (must not exist yet):
```
lib/editor/types.ts
lib/editor/access-logger.ts
lib/editor/consistency-engine.ts
lib/editor/date-detector.ts
hooks/useEditorState.ts
components/transcripts/AudioPlayer.tsx
components/transcripts/TranscriptPanel.tsx
components/transcripts/FlaggedWordPanel.tsx
app/(dashboard)/jobs/[id]/review/ReviewPageClient.tsx  (replaces or enhances existing)
app/(dashboard)/jobs/[id]/review/error.tsx
app/(dashboard)/jobs/[id]/review/loading.tsx
app/api/transcriptions/[id]/flagged-words/[wordId]/route.ts
app/api/transcriptions/[id]/review-progress/route.ts
app/api/transcriptions/[id]/flags/route.ts
app/api/transcriptions/[id]/consistency/route.ts
app/api/transcriptions/[id]/consistency/apply/route.ts
app/api/jobs/[id]/review-complete/route.ts
app/api/user/preferences/route.ts
```

## Known Issues from Phase 1 (if any)

[Copy any known limitations from ai_logs/phase1_completion.md]

## Phase 2 Start Command

```
claude code --no-resume
→ Execute ai_prompts/phases/phase_02_transcript_editor.md exactly.
  Start with the pre-flight checks in Section 0.
  Complete every step in order.
  One commit per step.
  Do not stop unless a Phase B database table is missing from Supabase.
```
```

---

## FINAL VERIFICATION

```bash
npx tsc --noEmit
npm run build
```

Both must pass after documentation commits.

---

## COMPLETION REPORT

```
╔═══════════════════════════════════════════════════════════════════════╗
║         DEPO-PRO — PHASE 1 FORMALLY COMPLETE                         ║
╠═══════════════════════════════════════════════════════════════════════╣
║  Completion record:   ai_logs/phase1_completion.md    WRITTEN        ║
║  DOCX checklist:      ai_logs/docx_inspection.md      WRITTEN        ║
║  CLAUDE.md updated:   Phase 1 COMPLETE, Phase 2 READY               ║
║  Phase 2 handoff:     ai_logs/phase2_context.md       WRITTEN        ║
╠═══════════════════════════════════════════════════════════════════════╣
║  PHASE 1 STATUS: SIGNED OFF                                          ║
╠═══════════════════════════════════════════════════════════════════════╣
║  PHASE 2 IS AUTHORIZED TO BEGIN                                      ║
║                                                                       ║
║  Command:                                                             ║
║    claude code --no-resume                                            ║
║    → Execute ai_prompts/phases/phase_02_transcript_editor.md         ║
╚═══════════════════════════════════════════════════════════════════════╝
```

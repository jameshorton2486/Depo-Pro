# ═══════════════════════════════════════════════════════════════════════════════
# DEPO-PRO — PHASE 1B: POST-IMPLEMENTATION VALIDATION GATE
# Autonomous Verification Prompt for Codex CLI / Claude Code
#
# Save to:  ai_prompts/phases/phase_01b_validation_gate.md
# Session:  claude code --no-resume
# Run:      AFTER phase_01_formatter_implementation.md completes
# Version:  1.0 — Self-Contained
#
# This prompt runs the full validation suite against the formatter
# implementation and produces a pass/fail report. It does not write
# application code — it executes checks, runs tests, and documents results.
#
# Exit criterion: All 6 checks pass and ai_logs/phase1_validation.md written.
# ═══════════════════════════════════════════════════════════════════════════════

---

## MISSION

Execute the complete Phase 1 validation gate.

This prompt confirms the formatter pipeline implementation is correct,
complete, and production-safe before the UI trigger and milestone
documentation steps proceed.

Six checks must all pass:

1. TypeScript — zero errors
2. Linting — zero errors
3. Production build — passes
4. Unit tests — all passing
5. Integration test — Olivarez exits clean
6. File manifest — all 13 required files present

Do not modify any application code. If a check fails, document the
failure in the report and stop. Do not attempt fixes in this session.

---

## EMBEDDED PLATFORM CONTEXT

**Stack:** Next.js 15 App Router · TypeScript · Supabase · Deepgram
**Auth:** Supabase SSR · `profiles` table · `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
**Frozen files:** `lib/supabase/server.ts` · `lib/auth/session.ts` · `middleware.ts`
**Verbatim mandate:** `transcript_words.original_word` is immutable

**Non-negotiable formatting rules:**
- Em dash `—` → double hyphen `--` (always)
- `THE COURT REPORTER` → `THE REPORTER` (always)
- 25 lines per page maximum
- Courier New 12pt, US Letter 8.5"×11"

---

## CHECK 1 — TYPESCRIPT

```bash
npx tsc --noEmit 2>&1
```

**Pass condition:** Zero errors reported.

If errors exist: record each file path and error message in the report.
Do not suppress with `@ts-ignore`. Do not modify files.

Log: `[PASS] 0 TypeScript errors` or `[FAIL] N errors — see report`

---

## CHECK 2 — LINTING

```bash
npm run lint 2>&1
```

**Pass condition:** Zero errors. Warnings are acceptable.

Log: `[PASS] Lint clean` or `[FAIL] N lint errors — see report`

---

## CHECK 3 — PRODUCTION BUILD

```bash
npm run build 2>&1
```

**Pass condition:** Build completes with "Compiled successfully" or
equivalent success output. No error exit code.

Log: `[PASS] Build passing` or `[FAIL] Build failed — see report`

---

## CHECK 4 — UNIT TESTS

Run each formatter unit test file individually to isolate failures:

```bash
npx vitest run tests/unit/formatter/post-processor.test.ts 2>&1
npx vitest run tests/unit/formatter/section-detector.test.ts 2>&1
npx vitest run tests/unit/formatter/paragraph-builder.test.ts 2>&1
npx vitest run tests/unit/formatter/paginator.test.ts 2>&1
npx vitest run tests/unit/formatter/quality-gate.test.ts 2>&1
```

For each file, log the pass count and fail count.

**Critical assertions to verify are present and passing:**

Post-processor:
- `—` (U+2014) → `--` in output
- `–` (U+2013) → `--` in output
- `THE COURT REPORTER` → `THE REPORTER`
- `2:12 PM` → `2:12 p.m.`
- Smart quotes `"` `"` → straight `"`

Paragraph builder:
- `reporter` role → label `THE REPORTER:` never `THE COURT REPORTER:`
- `examining_attorney` in exam section → label `Q.`
- `witness` in exam section → label `A.`

Paginator:
- No page exceeds 25 lines (`line_number_end <= 25` on all paragraphs)
- `line_number_start` resets to 1 on each page transition
- `page_number` starts at 1

Quality gate:
- QG-011: paragraph with `—` → `passed: false`, severity `WARNING`
- QG-012: `THE COURT REPORTER` in label → `passed: false`, severity `WARNING`
- `exportBlocked: true` when any ERROR check fails
- `errorCount` and `warningCount` are counted correctly

Log overall: `[PASS] All unit tests passing — NN tests` or
`[FAIL] N failures in [file] — see report`

---

## CHECK 5 — INTEGRATION TEST (EXIT CRITERION)

```bash
npx vitest run tests/integration/formatter-pipeline.test.ts 2>&1
```

This is the Phase 1 exit criterion. Every assertion must pass.

**Assertions that must all be true:**

```
✓ Fixture loads and contains words
✓ Fixture contains "miyamardeau" with confidence < 0.50
✓ Post-processor removes all em dashes from text
✓ Post-processor normalizes THE COURT REPORTER label
✓ Post-processor normalizes "2:12 PM" → "2:12 p.m."
✓ Paginator keeps all paragraphs within 25 lines per page
✓ Paginator starts page numbering at 1
✓ Section detector identifies DIRECT EXAMINATION
✓ DOCX assembler returns a non-empty Buffer (> 1,000 bytes)
✓ No em dash survives post-processing
✓ No "THE COURT REPORTER" survives post-processing
```

Log:
- `[PASS — EXIT CRITERION MET] All integration assertions passing`
- OR `[FAIL — EXIT CRITERION NOT MET] N assertions failing`

If the exit criterion is not met, Phase 1 is not complete. List every
failing assertion in the report. Do not proceed to Phase 1C or Phase 1D
until this check passes.

---

## CHECK 6 — FILE MANIFEST

Verify that all 13 required Phase 1 files exist and are non-empty (> 0 bytes):

```
lib/transcription/formatter/types.ts
lib/transcription/formatter/section-detector.ts
lib/transcription/formatter/paragraph-builder.ts
lib/transcription/formatter/post-processor.ts
lib/transcription/formatter/paginator.ts
lib/transcription/formatter/quality-gate.ts
lib/transcription/formatter/inclusion-pages.ts
lib/transcription/formatter/docx-assembler.ts
lib/transcription/formatter/index.ts
app/api/transcriptions/[id]/format/route.ts
tests/fixtures/olivarez-deepgram-output.json
tests/unit/formatter/ (5 test files)
tests/integration/formatter-pipeline.test.ts
```

For each file: `[EXISTS — NNN bytes]` or `[MISSING]` or `[EMPTY]`

---

## WRITE VALIDATION REPORT

Create: `ai_logs/phase1_validation.md`

```markdown
# Depo-Pro — Phase 1 Validation Report
Generated: [TIMESTAMP]

## Check Results

| Check | Status | Detail |
|---|---|---|
| TypeScript | PASS / FAIL | [error count] |
| Linting | PASS / FAIL | [error count] |
| Build | PASS / FAIL | [output summary] |
| Unit tests | PASS / FAIL | [NN passing, NN failing] |
| Integration test | PASS / FAIL | [NN passing, NN failing] |
| File manifest | PASS / FAIL | [NN / 13 present] |

## Exit Criterion

Phase 1 exit criterion (Olivarez integration test):
[ ] PASSED — Phase 1 is COMPLETE
[ ] FAILED — Phase 1 is IN PROGRESS

## Unit Test Results

### post-processor.test.ts: NN/NN passing
[list any failures]

### section-detector.test.ts: NN/NN passing
[list any failures]

### paragraph-builder.test.ts: NN/NN passing
[list any failures]

### paginator.test.ts: NN/NN passing
[list any failures]

### quality-gate.test.ts: NN/NN passing
[list any failures]

## Integration Test Results

[list each assertion with PASS / FAIL]

## File Manifest

[list each file with EXISTS / MISSING / EMPTY]

## Failures Requiring Resolution

[List each failure with:
- Check name
- Error or assertion message
- File where failure originates
- Suggested resolution (do not implement — documentation only)]

## Recommendation

[PROCEED to Phase 1C (UI trigger) and Phase 1D (milestone docs)]
OR
[BLOCKED — resolve N failures before proceeding]
```

---

## COMPLETION

Output this summary:

```
╔═══════════════════════════════════════════════════════════════╗
║       DEPO-PRO — PHASE 1B VALIDATION GATE COMPLETE           ║
╠═══════════════════════════════════════════════════════════════╣
║  TypeScript:       PASS / FAIL                               ║
║  Linting:          PASS / FAIL                               ║
║  Build:            PASS / FAIL                               ║
║  Unit tests:       NN / NN passing                           ║
║  Integration test: PASS / FAIL                               ║
║  File manifest:    NN / 13 present                           ║
╠═══════════════════════════════════════════════════════════════╣
║  EXIT CRITERION:   MET / NOT MET                             ║
╠═══════════════════════════════════════════════════════════════╣
║  STATUS:  PROCEED to Phase 1C + 1D                           ║
║       OR  BLOCKED — N issues require resolution              ║
╚═══════════════════════════════════════════════════════════════╝
```

Do not write application code in this session.
Do not fix failing tests in this session.
Document failures for resolution in a targeted follow-up session.

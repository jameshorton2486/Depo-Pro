# Transcript Quality Scorecard

**Purpose:** Track reporter-visible transcript quality after each implementation PR.

Do not place real client names, deposition text, notices, audio, or other client artifacts in this file. Use approved synthetic fixture IDs in-repository and secure external validation references for authorized client validation.

## Scoring dimensions

| Dimension | What is measured | Current baseline | Latest PR | Trend |
|---|---|---|---|---|
| Recognition | Correct words, names, terms, and speaker recognition | Establish with first benchmark | — | — |
| Semantics | Speaker/examination/proceedings interpretation | Establish with W23D | — | — |
| Production | Q./A., colloquy, proceedings, and dialogue blocks | Establish with W23C/W23E | — | — |
| Formatting | Display, punctuation, UFM, and exported-text consistency | Establish with formatting PR | — | — |
| Overall Repair Burden | Reporter edits needed to reach an acceptable transcript | Establish with approved fixture review | — | — |

## Per-PR validation record

| PR | Transcript impact | Architectural owner | Synthetic fixtures | Secure validation reference | Regression | CI / typecheck / tests | Result |
|---|---|---|---|---|---|---|---|
| Baseline | Pending benchmark | — | — | Record outside repository | — | — | Pending |

## Update rule

After every implementation PR, add one row with before/after evidence, the responsible architectural owner, fixture results, and remaining reporter repair burden. A failed or inconclusive result is recorded as such; it is never converted to a pass by narrative.

## Version 0.7 — PR #7 Wave 23B

| Category | Before | After | Evidence |
|---|---|---|---|
| Recognition | No change | No change | No recognition code changed. |
| Semantic Integrity | Partial | Improved | Canonical failure regression tests and pre-ingest quarantine. |
| Production | No change | No change | Proceedings, examination, and dialogue deferred. |
| Formatting | No change | No change | No formatting code changed. |
| Reporter Repair Burden | High for malformed state | Reduced | Orphan, duplicate, and timing failures are quarantined. |

# Git Hygiene Audit

Date: 2026-06-23  
Branch: `feature/stage3-workspace-core`  
Mode: read-only audit with command recommendations only

## Section 1 — Modified Tracked Files

| File | Last Known Purpose | Likely Category |
|---|---|---|
| `.gitignore` | Adds `.aider*` ignore coverage for local AI-agent workspace artifacts. | `CONFIGURATION` |
| `src/api/client.ts` | Refactors API auth-token lookup to call `getSupabaseAccessToken()` instead of directly touching the Supabase client. | `APPLICATION_CODE` |
| `src/lib/supabase.ts` | Hardens Supabase auth bootstrap: session validation, stale-session clearing, bootstrap reset behavior, exported access-token helper. | `APPLICATION_CODE` |
| `src/main.tsx` | Allows mount/bootstrap flow to continue after Supabase session bootstrap failure with a warning instead of hard failure. | `APPLICATION_CODE` |

### Tracked-File Read

- The three TypeScript files are one coherent auth/session workstream and should be committed together if kept.
- `.gitignore` is separate hygiene/config work and should not be mixed into app-behavior commits unless the commit is explicitly “hygiene + auth session cleanup.”

## Section 2 — Untracked Files

| File | Class | Rationale |
|---|---|---|
| `AUDIT_TRANSCRIPT_TRANSFORM_PIPELINE.md` | `ARCHIVE` | Audit artifact at repo root; preserve if needed, but relocate into `docs/audits/` before any commit. |
| `docs/audits/CFE_PHASE0_FINDINGS.md` | `KEEP` | Referenced by later CFE readiness work; appears to be a real prerequisite audit. |
| `Canonical Standards Folder/CHANGELOG_dp010_incorporation.md` | `ARCHIVE` | Historical standards changelog, not implementation authority. |
| `Canonical Standards Folder/CHANGELOG_dp012_qa_review.md` | `ARCHIVE` | Historical standards changelog, not implementation authority. |
| `Canonical Standards Folder/CHANGELOG_three_tab_paragraph_rule.md` | `ARCHIVE` | Historical standards changelog, not implementation authority. |
| `Canonical Standards Folder/DEPO_PRO_FORMATTER_RULE_ENGINE.md` | `ARCHIVE` | Historical architecture/reference document per standards freeze. |
| `Canonical Standards Folder/DEPO_PRO_FORMATTER_SPEC.md` | `ARCHIVE` | Historical architecture/reference document per standards freeze. |
| `Canonical Standards Folder/DEPO_PRO_PROMPT_INDEX_AND_IMPLEMENTATION.md` | `ARCHIVE` | Prompt/index history; useful context, not active authority. |
| `Canonical Standards Folder/DP-009_HONORIFIC_ABBREVIATION_SPACING.md` | `ARCHIVE` | Historical standard; preserve only as standards history. |
| `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md` | `KEEP` | Active authority document; should be committed if this repo is expected to carry the approved standards set. |
| `Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md` | `KEEP` | Active authority document; should be committed if this repo is expected to carry the approved standards set. |
| `Canonical Standards Folder/NUMBERING_REGISTRY.md` | `DELETE` | Duplicate of tracked root `NUMBERING_REGISTRY.md`; do not keep two canonical registries. |
| `Canonical Standards Folder/PROMPT_AI_TRANSCRIPT_STRUCTURING_ENGINE.md` | `ARCHIVE` | Prompt artifact, not current implementation authority. |
| `Canonical Standards Folder/PROMPT_WORKSPACE_DOCX_TAB_STOPS.md` | `ARCHIVE` | Prompt artifact, not current implementation authority. |
| `Canonical Standards Folder/TRANSCRIPT_GEOMETRY_STANDARD.md` | `ARCHIVE` | Historical/supporting geometry note; `DP-011` is the approved authority. |
| `Canonical Standards Folder/WAVE21_CANONICAL_EXPORT_ARCHITECTURE.md` | `ARCHIVE` | Historical wave/architecture record. |
| `Canonical Standards Folder/abbreviation_registry.docx` | `ARCHIVE` | Authoring artifact; runtime uses JSON, not DOCX. |
| `Canonical Standards Folder/abbreviation_registry.json` | `KEEP` | Runtime input for CFE and part of the approved authority hierarchy. This is the highest-risk untracked file. |
| `DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md` | `DELETE` | Non-canonical duplicate path; current standards references point to the canonical standards folder version. |
| `docs/audits/ERROR_COVERAGE_MATRIX.md` | `KEEP` | Referenced by later audits and useful for implementation boundaries. |
| `docs/reconciliation/GEOMETRY_AUTHORITY_RECONCILIATION.md` | `ARCHIVE` | Intermediate governance artifact; preserve in docs if wanted, but not as a root loose file. |
| `docs/audits/KEYTERM_PIPELINE_FINDINGS.md` | `ARCHIVE` | Valid separate workstream artifact, but should live under `docs/audits/` if retained. |
| `PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md` | `DELETE` | Duplicate/legacy naming variant of DP-012 material; keeping both invites citation drift. |
| `docs/audits/SAVE_FAILURE_FINDINGS.md` | `ARCHIVE` | Investigation artifact; preserve only if needed, but move under `docs/audits/`. |
| `docs/audits/STANDARDS_CONSISTENCY_AUDIT.md` | `ARCHIVE` | Intermediate standards audit artifact; keep only in audit docs, not as loose root file. |
| `docs/audits/TRANSCRIPT_QUALITY_FINDINGS.md` | `ARCHIVE` | Investigation artifact; preserve only if needed, but move under `docs/audits/`. |
| `docs/audits/CFE_FIDELITY_VALIDATION.md` | `KEEP` | Current read-only validation deliverable. |
| `docs/audits/CFE_PHASE1_READINESS.md` | `KEEP` | Current readiness deliverable and referenced by implementation planning. |
| `docs/audits/REPOSITORY_HEALTH_AUDIT_2026-06-23.md` | `KEEP` | Formal dated repository audit; belongs in `docs/audits/`. |
| `docs/audits/SPEAKER_SAVE_CONCURRENCY_AUDIT.md` | `KEEP` | Formal technical audit in the correct folder. |
| `etminan_response.json` | `ARCHIVE` | Useful validation corpus artifact, but too bulky and case-specific to leave loose at repo root. Move to a dedicated fixtures/reference location if you intend to keep it. |
| `parity_job.json` | `DELETE` | Known misleading artifact: Etminan content bound to Garza metadata. Unsafe to keep as-is. |
| `reference/wave8/backend/__pycache__/` | `DELETE` | Python cache artifact inside read-only reference tree; should not be versioned. |
| `reference/wave8/backend/ai_review/__pycache__/` | `DELETE` | Python cache artifact inside read-only reference tree; should not be versioned. |
| `scripts/inspect-deepgram-clusters.mjs` | `KEEP` | Read-only diagnostic script with clear narrow purpose; useful for future transcript/keyterm investigations. |
| `src/lib/supabase.test.ts` | `KEEP` | Real test coverage for the uncommitted Supabase auth/session changes. |

### Untracked-File Read

- Highest-priority `KEEP` items:
  - `Canonical Standards Folder/abbreviation_registry.json`
  - `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md`
  - `Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`
  - `src/lib/supabase.test.ts`
- Highest-priority `DELETE` items:
  - `parity_job.json`
  - both `__pycache__/` directories
  - duplicate root DP-012 naming variants
- Largest structure problem:
  - too many valid audit artifacts are sitting at repo root instead of `docs/audits/`

## Section 3 — Files That Should Likely Be Added To `.gitignore`

Recommended additions:

- `**/__pycache__/`
  - Python cache directories should never appear, especially under `reference/wave8/`.
- `*.pyc`
  - Same reason; prevents cache-file drift.
- `.aider.chat.history.md`
  - Local AI session artifact; should not be reviewed or committed.
- `.aider.input.history`
  - Local AI session artifact.
- `.aider.tags.cache.v4`
  - Local AI cache artifact.

Optional, but only if you explicitly do not want transcript investigation payloads in git:

- `etminan_response.json`
- `parity_job.json`

I would not broadly ignore:

- `docs/audits/*.md`
  - many of these are intentional deliverables.
- `Canonical Standards Folder/*.md`
  - some are active authority inputs and should be committed intentionally, not ignored.

## Section 4 — Recommended Commit Groups

### Commit A — Auth Session Work

Scope:

- `src/api/client.ts`
- `src/lib/supabase.ts`
- `src/main.tsx`
- `src/lib/supabase.test.ts`

Reason:

- One coherent application-code change set around Supabase bootstrap/session handling.

### Commit B — Gitignore Cleanup

Scope:

- `.gitignore`

Reason:

- Pure repository hygiene/configuration change.

### Commit C — Standards Authority Sources

Scope:

- `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md`
- `Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`
- `Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md` if not already fully committed at HEAD
- `Canonical Standards Folder/abbreviation_registry.json`

Reason:

- These are active implementation authorities or runtime authority data and should not remain untracked.

### Commit D — Audit Documents

Scope:

- `docs/audits/CFE_PHASE1_READINESS.md`
- `docs/audits/CFE_FIDELITY_VALIDATION.md`
- `docs/audits/REPOSITORY_HEALTH_AUDIT_2026-06-23.md`
- `docs/audits/SPEAKER_SAVE_CONCURRENCY_AUDIT.md`
- plus any root audit files you intentionally relocate into `docs/audits/`

Reason:

- Keeps investigation/reporting material separate from code and standards authority.

### Commit E — Diagnostic Utilities

Scope:

- `scripts/inspect-deepgram-clusters.mjs`

Reason:

- Useful tooling, but separable from product code and standards docs.

## Section 5 — Exact Git Commands

Do not run these blindly; they are the recommended sequence only.

### 1. Inspect current state again

```powershell
git status --short
git diff -- .gitignore
git diff -- src/api/client.ts
git diff -- src/lib/supabase.ts
git diff -- src/main.tsx
```

### 2. Create a hygiene commit for `.gitignore`

```powershell
git add .gitignore
git commit -m "chore(git): ignore local agent and python cache artifacts"
```

### 3. Commit the Supabase auth/session work if you intend to keep it

```powershell
git add src/api/client.ts src/lib/supabase.ts src/main.tsx src/lib/supabase.test.ts
git commit -m "fix(auth): harden supabase session bootstrap and token access"
```

### 4. Commit active standards/runtime authority sources

```powershell
git add "Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md" "Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md" "Canonical Standards Folder/DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md" "Canonical Standards Folder/abbreviation_registry.json"
git commit -m "docs(standards): add active formatting authority sources"
```

### 5. Commit kept audit documents

```powershell
git add docs/audits/CFE_PHASE1_READINESS.md docs/audits/CFE_FIDELITY_VALIDATION.md docs/audits/REPOSITORY_HEALTH_AUDIT_2026-06-23.md docs/audits/SPEAKER_SAVE_CONCURRENCY_AUDIT.md docs/audits/CFE_PHASE0_FINDINGS.md docs/audits/ERROR_COVERAGE_MATRIX.md
git commit -m "docs(audits): add cfe readiness and fidelity reports"
```

### 6. Commit diagnostic tooling if desired

```powershell
git add scripts/inspect-deepgram-clusters.mjs
git commit -m "chore(diagnostics): add deepgram cluster inspection script"
```

### 7. Remove confirmed junk or duplicate files

```powershell
Remove-Item -Recurse -Force reference\wave8\backend\__pycache__
Remove-Item -Recurse -Force reference\wave8\backend\ai_review\__pycache__
Remove-Item -Force parity_job.json
Remove-Item -Force DP-012_PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md
Remove-Item -Force PUNCTUATION_RECONCILIATION_AND_GARBLE_FLAGS.md
Remove-Item -Force "Canonical Standards Folder\NUMBERING_REGISTRY.md"
```

### 8. Final verification pass before any push

```powershell
git status --short
git log --oneline -8
```

## Bottom Line

The working tree is not messy because of one thing; it is messy because three categories are mixed together:

- real application code drift
- valid but uncommitted standards/audit deliverables
- disposable investigation residue

The most important cleanup decision is to separate those into different commits and to stop leaving active authority inputs untracked, especially:

- `Canonical Standards Folder/abbreviation_registry.json`
- `Canonical Standards Folder/DP-010_SENTENCE_BOUNDARY_ABBREVIATION_SPACING.md`
- `Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`

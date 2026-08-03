# Repository Branch Census

**Phase:** 1 — Repository Census  
**Date:** 2026-08-01  
**Mode:** Read-only branch audit; this report is the only created artifact  
**Canonical comparison target:** `origin/feature/stage3-workspace-core` at `899a27a`  
**GitHub default branch:** `feature/stage3-workspace-core`

## Task 0 — Verification Gate

| Check | Result |
| --- | --- |
| Repository | `jameshorton2486/Depo-Pro` |
| Remote | `origin` → `https://github.com/jameshorton2486/Depo-Pro.git` |
| GitHub authentication | Available |
| Current local branch | `feature/transcription-benchmark` |
| Current branch upstream | Deleted after PR #44 merged |
| Working tree | One pre-existing untracked file: `scripts/compare_utt_split.py` |
| Branch mutations made | None |
| PR #44 | Merged into the canonical branch |
| Canonical CI | Failing lint: two `no-explicit-any` errors in `supabase/functions/ai-review/index.ts` |

The gate passed for a census. The untracked script was not read, edited, staged, or deleted.

## Classification Definitions

| Category | Meaning |
| --- | --- |
| KEEP | Active authoritative branch or a branch that must remain until a later gate |
| MERGE | Reviewed work intended for integration through a pull request |
| CHERRY PICK | A specific unique commit appears worth transferring, subject to its phase gate |
| ARCHIVE | Historical or recovery branch; preserve but do not merge wholesale |
| DELETE | Fully contained or superseded branch; delete only in Phase 6 after preservation |
| UNKNOWN | Diverged or patch-equivalent status requires the dedicated reconciliation audit |

`Behind` and `Ahead` are measured against `origin/feature/stage3-workspace-core`. “Contained” means the branch tip is an ancestor of the canonical branch.

## Executive Findings

- The canonical branch is `feature/stage3-workspace-core`, not `main`.
- PR #44 is already merged. Its deleted feature branch is fully contained locally.
- Twenty-nine local feature/fix branches are directly proven fully contained and are Phase 6 deletion candidates.
- `feat/atia-bridge` is fully contained both locally and remotely.
- `fix/qa-provenance` and `fix/qafixer-word-provenance` are duplicate pointers to the same single unique commit, `4207e5e`; one copy should be reviewed for cherry-pick and the duplicate removed later.
- `main` is not safe to merge wholesale. Remote `main` is 308 behind and 62 ahead of canonical; local `main` is five commits ahead of remote `main` and matches the archive line.
- The backup, WIP, release, and archive branches are intentionally preserved pending the bundle/tag preservation gate.
- PR #43 is the only open pull request. Its branch is 9 behind and 2 ahead and currently conflicts with canonical.

## Local Branches (41)

| Branch | Upstream | Default delta (B/A) | Contained | Last activity | Last commit | Purpose | Recommendation |
| --- | --- | ---: | :---: | --- | --- | --- | --- |
| `agent/certification-mutation-locks` | gone | 96/0 | Yes | 2026-07-21 | `dafac1c` guard export handlers | Certification protections | DELETE |
| `archive/main-pre-wave23` | none | 308/67 | No | 2026-06-17 | `3a8ec34` corrections deferral audit | Historical pre-Wave23 main | ARCHIVE |
| `backup/stage3-local-2026-07-21` | in sync | 161/17 | No | 2026-07-20 | `c1aca3f` stabilization standard | Stage 3 recovery point | ARCHIVE |
| `cleanup/transcript-dead-code` | gone | 57/0 | Yes | 2026-07-22 | `a724c72` remove dead paths | Completed cleanup | DELETE |
| `codex/deepgram-workspace-boundary` | canonical; behind 58 | 58/0 | Yes | 2026-07-22 | `2d9e591` merge PR #23 | Historical boundary work | DELETE |
| `codex/export-path-baseline` | canonical; behind 61 | 61/0 | Yes | 2026-07-22 | `ecc089e` export baseline | Completed baseline | DELETE |
| `codex/rc-hardening-pr20` | gone | 59/0 | Yes | 2026-07-22 | `a7424dd` RC hardening | Merged RC work | DELETE |
| `dependency-security-audit-local` | gone | 163/1 | No | 2026-07-10 | `f1528e1` update ws floor | Dependency security; likely patch-equivalent to PR #2 | UNKNOWN |
| `docs/architecture-audit` | canonical; behind 156 | 156/0 | Yes | 2026-07-20 | `85f5ca9` audit status | Merged documentation | DELETE |
| `docs/cts-v1` | gone | 28/1 | No | 2026-07-28 | `ed73e72` CTS v1 | PR #39 was merged via a different commit | UNKNOWN |
| `docs/repository-stabilization` | canonical; behind 159 | 159/0 | Yes | 2026-07-20 | `b663500` ownership references | Merged governance work | DELETE |
| `docs/transcript-pipeline-report` | gone | 37/1 | No | 2026-07-28 | `47d3f0c` pipeline report | PR #38 was merged via a different commit | UNKNOWN |
| `feat/atia-bridge` | in sync | 9/0 | Yes | 2026-07-31 | `84113a9` env helpers | ATIA Phase 1 and bridge | DELETE |
| `feat/deterministic-editorial-rules` | canonical; behind 118 | 118/0 | Yes | 2026-07-21 | `a8b49ce` merge PR #17 | Merged editorial work | DELETE |
| `feat/entity-registry` | gone | 132/0 | Yes | 2026-07-20 | `84bdccb` registry cleanup | Merged entity registry | DELETE |
| `feat/export-service-contract` | canonical; behind 119 | 119/0 | Yes | 2026-07-21 | `6ba2cba` contract validation | Merged export contract | DELETE |
| `feat/finalization-pipeline` | gone | 57/0 | Yes | 2026-07-22 | `2b65431` finalization pipeline | Merged finalization work | DELETE |
| `feat/formatter-service` | gone | 87/0 | Yes | 2026-07-21 | `8fbf39e` active-job evidence | Merged formatter work | DELETE |
| `feat/geometry-layout` | gone | 126/0 | Yes | 2026-07-21 | `f5e86fa` layout hardening | Merged geometry work | DELETE |
| `feat/recover-transcript` | gone | 38/0 | Yes | 2026-07-24 | `63a4e1a` sync recovery branch | Merged recovery work | DELETE |
| `feat/structured-transcript-package` | gone | 136/0 | Yes | 2026-07-20 | `2cefadb` package validation | Merged structured package | DELETE |
| `feat/transcribe-watchdog` | gone | 41/0 | Yes | 2026-07-24 | `4879734` watchdog | Merged watchdog work | DELETE |
| `feat/unified-rendering` | gone | 122/0 | Yes | 2026-07-21 | `0308e6f` clean paragraph mode | Merged rendering work | DELETE |
| `feat/w22-structured-transcript-core` | gone | 145/0 | Yes | 2026-07-20 | `0f7fef2` preserve provenance | Merged Wave 22 core | DELETE |
| `feat/w23b-canonical-integrity` | gone | 153/0 | Yes | 2026-07-20 | `12e0a67` timing validation | Merged Wave 23B | DELETE |
| `feat/w23c-proceedings` | gone | 149/0 | Yes | 2026-07-20 | `a455bae` proceedings contract | Merged Wave 23C | DELETE |
| `feat/w23d-examination-state-machine` | canonical; behind 142 | 142/0 | Yes | 2026-07-20 | `9ed0213` examination state | Merged Wave 23D | DELETE |
| `feat/w23e-dialogue-production` | gone | 139/0 | Yes | 2026-07-20 | `33e91ef` dialogue guard | Merged Wave 23E | DELETE |
| `feature/stage3-workspace-core` | canonical; behind 18 | 18/0 | Yes | 2026-07-28 | `c7bc9ea` recognition grouping | Local checkout of canonical; stale locally | KEEP |
| `feature/transcription-benchmark` | upstream gone | 1/0 | Yes | 2026-08-01 | `e7809db` reconcile Stage 3 | PR #44 benchmark branch | DELETE |
| `fix/explicit-diarize-flag` | gone | 53/0 | Yes | 2026-07-22 | `e1ee656` explicit diarize | Merged Deepgram fix | DELETE |
| `fix/qa-provenance` | none | 7/1 | No | 2026-08-01 | `4207e5e` QA provenance | Unique QA-fixer correction | CHERRY PICK |
| `fix/qafixer-word-provenance` | none | 7/1 | No | 2026-08-01 | `4207e5e` QA provenance | Duplicate pointer to same fix | DELETE |
| `fix/root-lifecycle-stability` | gone | 36/0 | Yes | 2026-07-27 | `acb0213` stable root | Merged lifecycle fix | DELETE |
| `fix/transcribe-callback-fail-loudly` | gone | 57/0 | Yes | 2026-07-22 | `dfa1353` fail loudly | Merged callback fix | DELETE |
| `main` | remote main; ahead 5 | 308/67 | No | 2026-06-17 | `3a8ec34` corrections deferral audit | Local legacy main; currently matches archive line, not remote main | KEEP |
| `pr17c-export-adapter` | gone | 63/0 | Yes | 2026-07-22 | `ef353d6` export cancellation | Merged export adapter | DELETE |
| `refactor/consumer-formatting-boundary` | gone | 130/0 | Yes | 2026-07-20 | `87ec564` formatting boundary | Merged refactor | DELETE |
| `release/2026.1` | in sync | 161/12 | No | 2026-07-12 | `9a49f4a` transcript contract | Historical release line | ARCHIVE |
| `verify-postmerge` | canonical; behind 14 | 14/0 | Yes | 2026-07-28 | `7f71306` merge PR #41 | Post-merge verification pointer | DELETE |
| `wip/stage3-worktree-2026-07-21` | in sync | 161/18 | No | 2026-07-21 | `7414ff4` Stage 3 snapshot | Recovery snapshot | ARCHIVE |

## Remote Branches (8)

The symbolic `origin`/`origin/HEAD` alias is excluded from the count.

| Branch | Default delta (B/A) | Contained | Last activity | Last commit | Purpose | Recommendation |
| --- | ---: | :---: | --- | --- | --- | --- |
| `origin/feature/stage3-workspace-core` | 0/0 | Yes | 2026-08-01 | `899a27a` merge PR #44 | Canonical integration/default | KEEP |
| `origin/feat/atia-bridge` | 9/0 | Yes | 2026-07-31 | `84113a9` env helpers | Fully merged ATIA feature | DELETE |
| `origin/cursor/secure-secrets-cli-setup-005e` | 9/2 | No | 2026-07-31 | `efa98ef` open-env helper | Open draft PR #43 | UNKNOWN |
| `origin/main` | 308/62 | No | 2026-06-17 | `05996ad` case reuse | Legacy main requiring Phase 2 audit | KEEP |
| `origin/release/2026.1` | 161/12 | No | 2026-07-12 | `9a49f4a` transcript contract | Historical release | ARCHIVE |
| `origin/backup/stage3-local-2026-07-21` | 161/17 | No | 2026-07-20 | `c1aca3f` stabilization | Recovery branch | ARCHIVE |
| `origin/wip/stage3-worktree-2026-07-21` | 161/18 | No | 2026-07-21 | `7414ff4` WIP snapshot | Recovery snapshot | ARCHIVE |
| `origin/archive/main-pre-wave23` | 308/67 | No | 2026-06-17 | `3a8ec34` corrections deferral | Historical main archive | ARCHIVE |

## Pull Request Context

| PR | State | Head | Finding | Recommendation |
| --- | --- | --- | --- | --- |
| #44 — Transcription benchmark | Merged | branch deleted | Present in canonical at `899a27a` | No action beyond CI repair |
| #43 — Secure secrets CLI setup | Open draft; conflicting | `cursor/secure-secrets-cli-setup-005e` | Two unique commits; 9 commits behind canonical | Phase 5 audit; do not merge yet |

## Recommendation Summary

### KEEP

- Canonical local/remote integration branch.
- Local and remote legacy `main` until Phase 2 is complete.

### CHERRY PICK

- Review `4207e5e` from `fix/qa-provenance`; the alias branch points to the same commit and must not be applied twice.

### ARCHIVE

- All branches explicitly named `archive`, `backup`, `release`, or `wip`.
- Preserve these through the bundle-and-tag gate and the main promotion.

### DELETE IN PHASE 6

- Branches marked DELETE above are either directly contained in canonical or duplicate a preserved pointer.
- No branch should be deleted before the preservation bundle and backup tag are verified.

### UNKNOWN / LATER GATES

- The three non-ancestor local branches associated with already merged documentation/security PRs need patch-equivalence checks before deletion.
- PR #43 belongs to Phase 5.
- The legacy main line belongs exclusively to Phase 2.

## Phase 1 Exit Decision

**PASS.** Every current local and remote branch has an initial classification. No branch, tag, commit, working-tree file, or remote history was changed. Phase 2 may begin with a commit-by-commit audit of the 62 commits unique to remote `main`; the five additional commits on local `main` must be audited as a separate local-only tail.

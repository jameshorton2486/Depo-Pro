# REPOSITORY HEALTH AUDIT

Date: 2026-06-23  
Scope: repository health, architecture compliance, and immediate execution priorities  
Mode: audit only

## Executive Summary

The repository is functional but not cleanly aligned with its locked architecture.

Current validation status:

- `npm run typecheck`: PASS
- `npm run test`: PASS (`53` files, `259` tests)
- `npm run lint`: FAIL (`44` errors)

Recommended execution decision: **stabilize the current architecture before adding more feature surface**.

The highest-priority blockers are:

1. Stage 3 performance architecture is not compliant with the required virtualization rule.
2. Certification and export gating rely on `localStorage`, which violates the project persistence rules for workflow data.
3. The repository is not passing its full quality gate because lint is red.
4. Working-tree hygiene is drifting through unignored cache artifacts inside the Wave8 reference area.

## Review Context

This review is a repository health and architectural assessment, not a feature prioritization pass.

The assessment is based on live code, current validation output, and direct inspection of the implementation paths that govern:

- app mounting and runtime wiring
- transcript workspace rendering
- certification/export workflow state
- repository quality gates

The root audit-document backlog was not treated as the primary source of truth for this review.

## Evidence Summary

### Locked-architecture compliance

- Single mount entry remains intact through [src/main.tsx](/C:/Users/james/projects/depo-pro/src/main.tsx:36).
- Network discipline remains intact: `fetch()` calls are centralized in [src/api/client.ts](/C:/Users/james/projects/depo-pro/src/api/client.ts:1).
- Audio current-time handling is compliant with the performance rule: shared ref-based timing and RAF-driven highlighting are implemented in [src/context/AudioContext.tsx](/C:/Users/james/projects/depo-pro/src/context/AudioContext.tsx:37) and [src/components/TranscriptEditor/TranscriptEditor.tsx](/C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:234).

### Validation status

- `npm run typecheck`: PASS
- `npm run test`: PASS
- `npm run lint`: FAIL

Lint failures include:

- `no-explicit-any` errors in `Audit/runAudit.ts`
- an empty catch block in [src/api/intakeDesktopService.ts](/C:/Users/james/projects/depo-pro/src/api/intakeDesktopService.ts:21)
- a parsing failure because [src/types/database.ts](/C:/Users/james/projects/depo-pro/src/types/database.ts:1) is UTF-16 encoded and is treated as binary by ESLint

## Findings

### 1. Stage 3 performance architecture is out of compliance

Severity: `High`

The transcript workspace is still rendered as one monolithic TipTap editor tree.

Evidence:

- editor creation occurs in [src/components/TranscriptEditor/TranscriptEditor.tsx](/C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:134)
- full editor content is mounted through [EditorContent](/C:/Users/james/projects/depo-pro/src/components/TranscriptEditor/TranscriptEditor.tsx:330)
- no `@tanstack/react-virtual` usage was found in the workspace rendering path

Why this matters:

- AGENTS rules require utterance-list virtualization for 30,000+ word performance
- the current implementation may be acceptable for smaller documents but it is not compliant with the declared scale target
- adding more Stage 3 UI behavior on top of a noncompliant rendering model increases refactor cost

Decision:

- **Do not expand Stage 3 feature surface until the team either implements virtualization or formally revises the architecture requirement with justification.**

### 2. Certification and export state violate workflow persistence rules

Severity: `High`

Certification readiness is stored in browser `localStorage` and export enablement depends on that client-side state.

Evidence:

- certification state read/write in [src/components/CertificationScreen/CertificationScreen.tsx](/C:/Users/james/projects/depo-pro/src/components/CertificationScreen/CertificationScreen.tsx:22)
- export readiness derived from `localStorage` in [src/components/ExportScreen/ExportScreen.tsx](/C:/Users/james/projects/depo-pro/src/components/ExportScreen/ExportScreen.tsx:38)

Why this matters:

- project rules prohibit client-side persistence for transcript/workflow data
- certification state can diverge across browsers or profiles
- export gating can be bypassed by local tampering
- the authoritative case/transcript persistence layer is being bypassed

Decision:

- **Move certification/export state into the authoritative case/transcript persistence layer before building additional downstream release workflow.**

### 3. Full repository quality gate is not green

Severity: `High`

The repo passes typecheck and tests but fails lint with 44 errors.

Why this matters:

- the working definition of “healthy” cannot stop at typecheck/test when lint is part of the enforced gate
- the current red state makes it harder to distinguish new regressions from pre-existing debt
- encoding and rule violations will continue to consume review time until the baseline is restored

Decision:

- **Treat lint restoration as a prerequisite stabilization task, not optional cleanup.**

### 4. Repository hygiene is drifting around reference materials

Severity: `Medium`

Untracked Python cache artifacts exist inside the Wave8 reference tree, and `.gitignore` does not currently exclude those artifacts.

Why this matters:

- the Wave8 reference tree is designated read-only normative material
- cache artifacts create avoidable review noise
- hygiene drift increases the chance of accidental staging or mistaken edits in reference material

Decision:

- **Update ignore rules and remove cache artifacts from the working tree before additional repo-wide cleanup work.**

## Execution Order

### Priority 0: Restore the repository baseline

Scope:

- clear current lint errors
- resolve UTF-16 / binary parsing issue for `src/types/database.ts` or explicitly lint-ignore generated output
- remove empty catch and obvious rule violations
- decide whether `Audit/` code is part of the enforced lint scope; if yes, fix it; if no, exclude it intentionally

Acceptance criteria:

- `npm run typecheck` passes
- `npm run test` passes
- `npm run lint` passes
- no new ignores are added without a documented reason

Owner recommendation:

- platform/repo maintainer

### Priority 1: Remove client-side workflow persistence for certification/export

Scope:

- design a persisted certification state owned by the authoritative case/transcript store
- replace `localStorage` gating for certification/export
- ensure export readiness derives from persisted workflow state, not browser-local state

Acceptance criteria:

- certification survives reload and reopen through the authoritative persistence layer
- certification state is consistent across sessions using the same case/transcript source
- export enablement no longer depends on browser-local storage
- no transcript/workflow data is written to `localStorage` or `sessionStorage`

Owner recommendation:

- workflow/data-integrity owner

### Priority 2: Resolve the Stage 3 scaling decision

Scope:

- either implement utterance virtualization around the transcript workspace
- or write a formal architecture exception/revision if the current TipTap structure is intended to remain

Acceptance criteria if implemented:

- large transcript loading and navigation remain responsive at the documented target scale
- virtualization approach is documented
- no regression to audio-word sync behavior

Acceptance criteria if architecture is revised:

- revision is documented in the authoritative architecture set
- rationale explains why the prior virtualization rule is no longer the governing constraint
- performance target and measurement strategy are restated explicitly

Owner recommendation:

- Stage 3/workspace owner

### Priority 3: Clean repository hygiene around reference and generated artifacts

Scope:

- ignore `__pycache__/` and `*.pyc`
- remove existing cache artifacts from the working tree
- confirm no reference files are modified as part of cleanup

Acceptance criteria:

- `git status --short` contains no Python cache artifacts
- `.gitignore` blocks recurrence
- Wave8 reference content remains untouched apart from untracked cache removal

Owner recommendation:

- repo maintainer

## What Should Not Happen Next

The team should not:

- add new Stage 3 feature panels before resolving the scaling decision
- add more workflow state to browser storage
- treat passing tests as sufficient while lint remains red
- continue accumulating root-level audit and report files without first restoring repo baseline discipline

## Final Recommendation

Recommendation: **OPTION B — stabilize specific architecture and quality gaps before further expansion**

This is not a stop-work recommendation for the whole repository. It is a sequencing recommendation:

1. restore quality baseline
2. fix certification/export persistence ownership
3. resolve the Stage 3 scaling architecture
4. then resume new feature expansion

## Bottom Line

`depo-pro` is not in crisis, but it is at the point where more feature work will cost more than it should unless the current architecture and quality drift are corrected first.

The next work should be stabilization work, not expansion work.

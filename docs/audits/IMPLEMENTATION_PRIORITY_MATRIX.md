# Implementation Priority Matrix

Date: 2026-06-26
Branch: feature/stage3-workspace-core

## Priority 1 — Build a Correction Orchestration Layer

### Goal

Introduce one read-only classification pass that inspects a transcript and produces:

1. source-level retranscription candidates
2. deterministic display-layer corrections
3. ambiguous review-only flags
4. speaker attribution concerns

### Why first

- The architecture already has correction surfaces.
- The missing piece is routing.
- This yields the biggest operational gain without touching canonical timed data.

### Layer

Display-layer safe.

### Suggested location

- new audit/service layer under `src/lib/transcript/`

## Priority 2 — Centralize Deterministic Rule Registry

### Goal

Separate the correction inventory from the formatter implementation so the system has one auditable registry for:

- deterministic garbles
- context-gated deterministic corrections
- review-only ambiguous patterns

### Why second

- `cfe.ts` and `qaFixer.ts` already perform these corrections, but the rules are distributed.
- Centralization reduces drift and makes future audits simpler.

### Layer

Display-layer safe.

### Suggested location

- new registry module consumed by `cfe.ts` and `qaFixer.ts`

## Priority 3 — Add a Correction Readiness Report Surface in the Workspace

### Goal

Show the reporter a pre-edit checklist:

- deterministic corrections already applied
- flagged ambiguous tokens
- candidate retranscription keyterms
- unresolved speaker issues

### Why third

- It turns the current invisible pipeline into an operator-visible workflow.
- It reduces hunting inside the transcript body.

### Layer

Display-layer safe.

## Priority 4 — Split Structure Review State Properly

### Goal

Make “Review & Confirm” and “Keep Raw Labels” distinct states instead of both calling `confirmStructure`.

### Why fourth

- Current behavior is semantically confusing.
- This affects whether structured inference is treated as accepted or merely dismissed.

### Layer

Display-layer safe.

## Priority 5 — Unify Raw and Clean Structured Paragraph Builders

### Goal

Refactor `buildTranscriptParagraphs` and `buildTranscriptParagraphsClean` to share one common assembly path with pluggable text serialization.

### Why fifth

- This is the highest drift-risk duplication in the current correction pipeline.
- It becomes more important as more correction rules are added.

### Layer

Display-layer safe.

## Priority 6 — Add Ambiguous-Term Review Workflow

### Goal

Promote flagged ambiguous substitutions into a dedicated review queue rather than leaving them as only inline annotations.

### Why sixth

- The flagging foundation already exists.
- This makes the system practically usable for context-dependent testimony corrections.

### Layer

Display-layer safe.

## Priority 7 — Retranscription Runbook Integration

### Goal

Connect keyterm improvement and retranscription candidates to the correction workflow so the app can explicitly recommend:

1. retranscribe first
2. then re-open structured display
3. then review remaining ambiguities

### Why seventh

- This is high value, but it depends on the orchestration layer first.

### Layer

Source-layer plus UI orchestration.

## Priority 8 — Participant Directory Completion

### Goal

Finish post-beta participant mapping:

1. directory
2. attribution map
3. synthetic speaker insert path across workflows
4. persistent reassignment support

### Why eighth

- Necessary for merged diarization cases.
- Already underway post-beta, but independent of deterministic text correction.

### Layer

Post-beta schema/workflow.

## Priority 9 — Certified-Grade SaaS Export Fidelity

### Goal

Upgrade the web export path beyond clean text and HTML-wrapped Word-compatible output.

### Why ninth

- Important for delivery fidelity.
- Less urgent than correction routing and reviewer workflow.

### Layer

Display/export-layer safe.

## Matrix

| Priority | Item | Value | Risk | Dependency |
|---|---|---:|---:|---|
| 1 | correction orchestrator | very high | low | none |
| 2 | centralized rule registry | high | low | 1 optional |
| 3 | correction readiness UI | high | low | 1 |
| 4 | structure review state split | medium | low | none |
| 5 | paragraph builder dedupe | medium | medium | none |
| 6 | ambiguous review queue | high | medium | 1 |
| 7 | retranscription integration | high | medium | 1 |
| 8 | participant directory completion | high | high | post-beta |
| 9 | export fidelity upgrade | medium | medium | none |

## Recommended Wave 22 Order

1. correction orchestrator
2. centralized deterministic/ambiguous rule registry
3. correction readiness audit surface in UI
4. ambiguous review queue
5. structure-review state split
6. raw/clean paragraph builder dedupe
7. retranscription recommendation flow

That order uses the existing architecture instead of fighting it, preserves audio sync, and gives Miah visible value before any canonical-risk work.

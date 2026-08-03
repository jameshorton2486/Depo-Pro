> **PROVISIONAL — UNRATIFIED.** Generated 2026-08-03 prior to ratification of
> `docs/architecture/RATIFIED_DECISIONS.md`. Descriptive findings are provisional
> pending verification. Prescriptive recommendations are **NOT authoritative** and
> are superseded by `RATIFIED_DECISIONS.md` where they conflict.

---
# Canonical Transcript Correction Architecture

## Decision

Adopt one command and one orchestration boundary:

**Workspace action:** `Correct and Format Transcript`  
**Service boundary:** `TranscriptCorrectionOrchestrator`  
**Proposal contract:** `CorrectionObject`  
**Decision audit:** append-only `correction_decisions`  
**Content authority:** immutable recognition baseline plus reporter-approved decisions

## Target flow

```text
Immutable Recognition Transcript (`raw_text`, timing, confidence, speaker numbers)
  -> Context snapshot (case, glossary, speaker registry, pipeline versions)
  -> TranscriptCorrectionOrchestrator
       1. canonical integrity validation
       2. deterministic word/STT/punctuation proposal engines
       3. speaker and entity proposal engines
       4. TIE provider-neutral AI proposal engines
       5. proceedings/Q&A/objection/structure proposal engines
       6. conflict resolution and CorrectionObject validation
       7. deterministic formatting preview
       8. QC findings
  -> Correction run (version + context hash + engine manifest)
  -> unified Corrections review queue
  -> reporter accept / reject / edit decisions
  -> Working Transcript projection
  -> Structured Transcript projection
  -> Legal formatting projection
  -> human certification
  -> export
```

## Required boundaries

### Recognition baseline

`raw_text`, provider timing/confidence, source order, and stable IDs never change. Boundary exclusions and synthetic material must be modeled as explicit structural metadata, not silent loss of the recognition view.

### Correction orchestration

All engines return proposals. No deterministic or AI engine directly writes working transcript text. The orchestrator assigns identity, location, provenance, confidence, reason, engine version, and conflict relationships.

### Human decisions

Manual typing remains valid human authorship. Machine proposals require accept/reject/edit. Applying a decision updates the working projection and appends a decision event; replay must reproduce the same working transcript.

### Formatting

Formatting consumes approved wording and structure. It owns whitespace, styles, labels, geometry, pagination, and export serialization. It must not silently correct lexical content. Any lexical normalization discovered during formatting returns upstream as a proposal.

### QC and certification

QC emits findings, not hidden fixes. Certification remains exclusively human and locks subsequent mutation according to existing policy.

## API and data model principles

- Keep frozen `src/api/types.ts` unchanged; introduce local/domain types and record deviations in `CONTRACT_NOTES.md` during implementation.
- Use one correction-run ID and one context hash per invocation.
- CorrectionObjects cover word, span, speaker, utterance boundary, line type, objection, and formatting proposals.
- Decision events record actor, old/new state, optional edited value, timestamp, and baseline/version context.
- The live TS AI Review becomes a temporary adapter that emits the same CorrectionObjects during migration.
- Provider selection uses vendor-neutral hints through `transcript_formatter/providers/`.

## UI architecture

- One command starts processing.
- One progress surface shows deterministic, AI, structure, formatting, and QC stages.
- One Corrections panel reviews all proposals.
- Speaker and Confidence panels remain focused review views over the same run/decision data.
- Layer selector exposes Recognition, Working, Structured, and Legal projections.
- Save remains permanent.

## Non-goals

The single button does not eliminate direct human editing, Save, speaker review, confidence review, certification, or view selection. Those are distinct human/QC operations and should not be hidden inside opaque automation.

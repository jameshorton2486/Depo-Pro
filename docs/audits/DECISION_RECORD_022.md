# Decision Record 022 — Architecture Freeze for the Structured Transcript Semantic Pipeline

**Date:** 2026-07-11  
**Status:** Accepted  
**Authority:** `docs/architecture/W22-2A_STRUCTURED_TRANSCRIPT_CONTRACT.md`  
**Applies To:** Wave 22 semantic pipeline and all future transcript-semantic work unless superseded by a later decision record

## Decision

Freeze the architecture of the transcript semantic pipeline.

The canonical pipeline is:

`Canonical Transcript`
`-> Semantic Producers`
`-> Structured Transcript Contract`
`-> Semantic Consumers`
`-> Formatting / Export / AI Review`

This pipeline is now the permanent architectural model for transcript semantics in DEPO-PRO.

No future implementation may create transcript semantics outside the Semantic Producer layer.

No future consumer may infer transcript meaning independently.

No architectural change may be made to this pipeline unless a later decision record explicitly changes it.

## Why this decision is being made

Wave 22 work revealed that the core architectural problem was not missing features. It was semantic duplication.

Transcript meaning was previously being created in multiple places:

- speaker labeling
- Q/A classification
- proceedings handling
- paragraph assembly
- downstream rendering behavior

That duplication created semantic drift.

The structured transcript contract, contract tests, and producer-integrity fixes established a more durable model:

- one producer creates each semantic value
- the structured transcript contract carries those values
- downstream consumers read those values without reinterpretation

This decision freezes that model so implementation can proceed without continued architectural churn.

## Canonical pipeline

### 1. Canonical Transcript

The canonical transcript is the immutable upstream semantic source.

It provides:

- canonical speakers
- canonical utterances
- canonical words
- timestamps
- raw transcript fidelity

### 2. Semantic Producers

Semantic producers are the only components permitted to create or change transcript semantics.

They enrich upstream transcript data into resolved semantic values.

### 3. Structured Transcript Contract

The structured transcript contract is the single semantic source of truth downstream of semantic production.

The runtime artifact may be implemented as a package object in code, but architecturally it is the contract boundary.

### 4. Semantic Consumers

Consumers read transcript semantics from the contract.

They do not recreate, reinterpret, or mutate semantic meaning.

### 5. Formatting / Export / AI Review

Formatting and other downstream processing happen after semantics have been established and validated.

## Semantic producers

Exactly one producer owns each semantic field.

Producers are the only components allowed to create or modify that field.

Current semantic producer map:

| Semantic Field | Producer |
| --- | --- |
| `speakerLabel` | `speakerResolutionEngine.ts` |
| speaker role | `speakerResolutionEngine.ts` |
| paragraph semantics | `transcriptParagraphs.ts` |
| `line_type` | `transcriptParagraphs.ts` |
| proceedings and related paragraph structure | `transcriptParagraphs.ts` |
| contract assembly | `structuredTranscriptPackage.ts` |
| boundary semantics | `boundaryEngine.ts` |
| optional metadata contribution | `buildUfmMetadata.ts` |

If ownership moves in the future, that move must be explicit and documented.

## Structured transcript contract

The structured transcript contract is the only downstream semantic contract.

It is the source of truth for:

- resolved speakers
- resolved labels
- resolved semantic roles
- paragraph structure
- line types
- provenance
- review metadata
- contract versioning

No consumer may bypass the contract to reconstruct transcript semantics.

No consumer may extend transcript semantics ad hoc.

No consumer may mutate transcript semantics.

## Semantic consumers

All downstream transcript consumers are consumers of the contract.

This includes:

- Workspace
- Stage S
- DOCX
- PDF
- TXT
- Copy Transcript
- AI Review
- export flows generally

They all consume.
They do not reconstruct.

## Permanent invariants

The following invariants are frozen unless a later decision record explicitly changes them:

- Canonical Transcript is immutable.
- Structured Transcript Contract is the only semantic contract.
- Every semantic responsibility has exactly one producer.
- Producers never consume downstream semantics.
- Consumers never reinterpret transcript meaning.
- Resolved semantic values are immutable after production.
- A producer may enrich semantics but never degrade them.
- Formatting is downstream of semantics.
- Deterministic corrections precede AI.
- Every semantic decision has provenance.
- Every contract revision increments the schema version.

## Semantic degradation rule

Semantic degradation is forbidden.

A producer may resolve a generic value into a richer semantic value.

Allowed example:

`SPEAKER 0 -> MR. BENTLEY`

Forbidden example:

`MR. BENTLEY -> SPEAKER 0`

More generally, semantic degradation is any transformation that loses already-resolved meaning.

Examples:

- resolved speaker -> generic speaker
- resolved Q/A -> unknown paragraph type
- proceedings classification -> plain paragraph with lost semantic meaning

These must fail regression tests.

## Producer-direction rule

The semantic pipeline is acyclic.

Allowed:

`Speaker Resolution -> Paragraph Assembly -> Contract`

Forbidden:

`Contract -> Speaker Resolution`

Producers never consume downstream semantics.

That rule prevents semantic backflow and hidden ownership duplication.

## Regression rule

Every semantic producer path should be tested with the same pattern:

`Resolved Value -> Producer -> Contract -> Consumer -> Same Value`

Required assertion:

- input semantics equal output semantics

This is now the standard regression shape for semantic pipeline work.

## Implementation rule

Future coding prompts should begin from this principle:

`Implement according to the Structured Transcript Contract.`

They should not begin by redesigning transcript semantics.

Design is complete.
Architecture is frozen.
Future work is implementation and validation.

## Roadmap consequence

This decision confirms the following Wave 22 sequencing:

- `W22-2.0` Structured Transcript Contract
- `W22-2A` Semantic Producer Consolidation
- `W22-2B` Contract Assembly
- `W22-2C` Consumer Migration
- `W22-2D` Legacy Retirement

Then:

- Miah evaluation
- `W22-3` Deterministic Corrections
- `W22-4` Canonical Punctuation
- `W22-5` AI Context
- `W22-6` Stage S

## Standing directive

No code may create transcript semantics outside the Semantic Producer layer.

If a Workspace component, formatter, export routine, Stage S routine, or AI feature needs transcript meaning, it must obtain that meaning from the Structured Transcript Contract rather than infer it independently.

## Change policy

No architectural changes are allowed to this semantic pipeline unless implementation demonstrates a genuine flaw in the contract and a later decision record explicitly approves a change.

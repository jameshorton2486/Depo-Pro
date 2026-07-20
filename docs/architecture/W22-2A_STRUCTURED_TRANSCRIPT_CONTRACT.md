# DEPO-PRO STRUCTURED TRANSCRIPT CONTRACT
W22-2A — Canonical Semantic Contract for the Transcript Pipeline

---

## STATUS

This document is a permanent architectural reference.

It defines the canonical semantic contract between the transcript-production pipeline and every downstream consumer in DEPO-PRO.

It is not an implementation prompt.
It is not a temporary migration note.
It is the authoritative reference for how transcript meaning is represented after canonical transcript ingestion.

When this document conflicts with older transcript-workflow assumptions, this document governs unless `MASTER_ARCHITECTURE.md` explicitly overrides it.

---

## CANONICAL DESIGN PRINCIPLES

These principles are the constitutional rules of the transcript pipeline.

- The canonical transcript is immutable as the source semantic record.
- The structured transcript contract is the only downstream semantic contract.
- Each semantic responsibility has exactly one owner.
- Consumers never reinterpret transcript meaning.
- Formatting is downstream of semantics.
- Deterministic corrections precede AI contextual processing.
- Every semantic decision must be traceable through provenance.
- Every contract revision must be explicit and versioned.

All future transcript-pipeline work must obey these principles unless a later architecture decision explicitly supersedes them.

---

## PURPOSE

DEPO-PRO previously allowed multiple consumers to reinterpret the canonical transcript independently.
That created drift in:

- speaker identity
- speaker role attribution
- Q/A structure
- colloquy handling
- paragraph boundaries
- downstream exports

The architectural correction is to define a single semantic contract:

`Canonical Transcript -> Structured Transcript Contract -> Consumers`

After this contract is established:

- producers resolve transcript meaning once
- consumers read that meaning
- consumers do not re-infer transcript semantics

This document defines that contract.

---

## SCOPE

This contract covers transcript semantics only.

It includes:

- resolved speakers
- resolved speaker labels
- resolved speaker roles
- structured transcript paragraphs and lines
- line types
- source utterance and word provenance
- confidence and review flags
- package identity and version metadata

It does not include presentation or rendering concerns.

It explicitly excludes:

- typography
- margins
- tab stops
- page geometry
- page numbers as visual layout artifacts
- DOCX formatting
- PDF formatting
- Stage S rendering rules
- font choices
- color or UI state

If a field exists only to support formatting, layout, or view-specific rendering, it does not belong in this contract.

---

## DEFINITIONS

### Layer 1 — Canonical Transcript

The canonical transcript is the authoritative normalized transcript data produced upstream from ingestion and boundary processing.

It is the source for:

- canonical speakers
- canonical utterances
- canonical words
- source timestamps
- source text

It is not yet the final semantic contract for downstream consumers.

### Layer 2 — Structured Transcript Contract

The structured transcript contract is the canonical semantic interpretation of the canonical transcript.

It resolves:

- who is speaking
- what role they occupy for transcript display purposes
- how transcript content is grouped into semantic paragraphs or lines
- what each structured unit represents
- which source utterances and words produced that unit

This is the boundary every downstream consumer must trust.

### Producer

A producer is a pipeline component that is authorized to populate one part of the contract.

### Consumer

A consumer is any component that reads the contract for display, export, review, or downstream transformation.

Consumers are read-only with respect to transcript semantics.

---

## ARCHITECTURAL RULE

The canonical architectural flow is:

`Canonical Transcript`
`-> Speaker Resolution`
`-> Paragraph / Structure Assembly`
`-> Structured Transcript Contract`
`-> Workspace / Export / Stage S / Review / Copy Flows`

This order is canonical.

No downstream consumer may bypass the contract and reconstruct transcript semantics directly from the canonical transcript unless an explicit migration exception is documented and temporary.

---

## CONTRACT OBJECT

The current runtime artifact implementing this contract may be named `StructuredTranscriptPackage` in code.

The architectural contract defined by this document is the semantic meaning of that object, not the file name used to build it.

The contract must contain, at minimum, the following categories:

### 1. Contract Identity

- `schema`
- `version`
- `producer`
- `builtAt`
- `transcriptId`

### 2. Resolved Speakers

Each speaker entry must provide:

- canonical `speakerId`
- resolved `displayName`
- resolved `role`
- source cluster identity when available, such as `deepgramSpeaker`

### 3. Structured Paragraphs or Lines

Each structured unit must provide:

- stable `id`
- semantic `kind`
- resolved `speakerId` when applicable
- resolved `speakerLabel`
- resolved `speakerRole`
- normalized transcript `text`
- source utterance ids
- source word ids

### 4. Semantic Type Information

Each structured unit must carry enough type information for consumers to distinguish at least:

- question
- answer
- colloquy
- parenthetical
- by-line
- section header

The concrete enum names may evolve, but the semantic meaning must remain stable and documented.

### 5. Provenance

Each structured unit must identify the source material that produced it.

At minimum:

- `sourceUtteranceIds`
- `sourceWordIds`

Additional provenance may be added later if it does not violate this contract’s semantic boundaries.

### 6. Confidence and Review State

Each structured unit must expose confidence and review metadata already available from upstream transcript data.

At minimum:

- aggregate confidence summary
- review flags
- pending-AI indicator if derived from existing source-word state

This metadata is descriptive.
It does not authorize AI to redefine transcript semantics.

---

## SEMANTIC REQUIREMENTS

The following meanings are fixed.

### Speaker

A speaker entry represents the resolved transcript-facing identity of a canonical speaker cluster or speaker record.

It is the only contract-level source for:

- display label
- transcript-facing role
- speaker identity used by structured paragraphs

### Role

Role is a transcript-semantic classification used by downstream consumers.

The role exists to support semantic interpretation, not styling.

Roles may include:

- attorney
- witness
- reporter
- videographer
- interpreter
- other
- unknown, only where resolution is incomplete and explicitly allowed

Any role vocabulary used in code must map deterministically to this semantic layer.

### Structured Paragraph

A structured paragraph is the canonical semantic grouping used by downstream transcript consumers.

It is not merely a visual line break.

It represents a transcript-semantic unit such as:

- a question
- an answer
- a colloquy turn
- a parenthetical
- a by-line
- a section header

### Line Type / Kind

Every structured unit must declare exactly one semantic kind.

If two meanings appear to apply, the producer logic is incomplete and must resolve the ambiguity before the contract is emitted.

### Provenance

Every structured unit must be traceable back to the canonical transcript.

No contract data may exist without provenance to the canonical source utterances or words that produced it.

---

## OWNERSHIP

Exactly one owner is responsible for each semantic responsibility.

Ownership is defined by semantic authority, not by how many files reference the data.

### Current Canonical Ownership Map

Speaker identity and display ownership:
- `src/lib/transcript/speakerResolutionEngine.ts`

Speaker role ownership:
- `src/lib/transcript/speakerResolutionEngine.ts`

Paragraph and line assembly ownership:
- `src/lib/transcript/transcriptParagraphs.ts`

Pre-workspace structural orchestration ownership:
- `src/lib/transcript/preWorkspaceStructure.ts`

Contract object assembly ownership:
- `src/lib/transcript/structuredTranscriptPackage.ts`

If these files are later renamed, the semantic ownership must remain singular and be re-documented here.

### Ownership Rule

No second module may silently become a competing semantic owner.

In particular:

- no alternate speaker-label builder
- no alternate paragraph assembler
- no consumer-local Q/A reconstruction
- no export-local speaker-role inference
- no workspace-local colloquy reconstruction

Compatibility adapters may exist during migration.
They may translate from the contract.
They may not become alternate semantic authorities.

---

## LIFECYCLE

The transcript semantic lifecycle is:

1. Canonical transcript is produced upstream.
2. Speaker resolution assigns transcript-facing speaker identities and roles.
3. Paragraph and structure assembly groups canonical content into semantic transcript units.
4. Contract assembly produces the structured transcript runtime object.
5. Consumers read that object.

The canonical contract must be buildable repeatedly from canonical transcript data and deterministic semantic producers.

The contract must not require UI state in order to exist.

---

## CONSUMER RULES

All downstream consumers are read-only with respect to transcript semantics.

This includes:

- workspace transcript display
- transcript text download
- DOCX export
- PDF export
- Stage S rendering
- copy transcript flows
- review panels
- certification views

Consumers may:

- render
- filter
- sort for presentation
- annotate externally
- format for export
- derive view-specific decorations

Consumers may not:

- rename speakers semantically
- reassign speaker roles
- infer new Q/A structure
- rebuild colloquy semantics
- invent paragraph boundaries
- reinterpret source utterances independently

If a consumer needs semantic data that does not exist in the contract, the contract must be extended through the producer pipeline rather than reconstructed locally.

---

## INVARIANTS

These invariants are mandatory.

### Contract Invariants

- Every contract object has a schema identifier.
- Every contract object has a version.
- Every contract object has a producer identifier.
- Every contract object has a build timestamp.
- Every contract object is traceable to exactly one canonical transcript id.

### Speaker Invariants

- Every speaker has exactly one canonical `speakerId`.
- Every structured unit that references a speaker must reference a valid contract speaker id.
- Speaker display names are resolved by the speaker owner, not by consumers.
- Speaker roles are resolved by the speaker owner, not by consumers.

### Structured Unit Invariants

- Every structured unit has exactly one semantic kind.
- Every structured unit has exactly one canonical provenance chain.
- Every structured unit has at least one source utterance id, source word id, or both, depending on unit type.
- Every structured unit that carries a speaker must have exactly one resolved speaker id.
- Every structured unit must be reproducible from canonical transcript data plus deterministic semantic producers.

### Consumer Invariants

- No consumer modifies contract semantics.
- No consumer infers speaker identity.
- No consumer reconstructs speaker role.
- No consumer reconstructs transcript structure independently.
- No consumer becomes a hidden semantic owner.

### Migration Invariants

- Legacy paths may remain temporarily only while migration is incomplete.
- Legacy paths must not diverge semantically from the contract.
- Legacy paths must be removed once all consumers are verified against the contract.

These invariants should be enforced with tests where practical.

---

## VERSIONING

The contract must be versioned from the start.

At minimum the runtime artifact must declare:

- `schema`
- `version`
- `producer`
- `builtAt`

### Versioning Rules

- Contract schema changes must be explicit.
- Backward-incompatible changes require a version change.
- Additive fields may be introduced without redefining existing semantic meaning.
- Field meanings may not drift silently.
- Consumers must not rely on undocumented fields.

The purpose of versioning is not serialization convenience.
It is semantic stability over time.

---

## PROVENANCE

Provenance is a first-class requirement of the contract.

Every structured semantic decision must be traceable back to the canonical transcript.

Minimum provenance:

- source utterance ids
- source word ids

Future provenance extensions may include:

- rule-based decision sources
- manual override markers
- AI suggestion lineage
- boundary or structure classification authority

Provenance exists to support:

- debugging
- reporter trust
- auditability
- deterministic re-runs
- future manual review tooling

Provenance does not change semantic ownership.

---

## WHAT DOES NOT BELONG IN THE CONTRACT

The following concerns are downstream and must not become part of the semantic contract unless a future architecture document explicitly expands scope:

- visual pagination
- page geometry
- font selection
- indentation as a purely visual concern
- DOCX layout directives
- PDF layout directives
- Stage S rendering geometry
- toolbar state
- workspace-only UI toggles
- color, theme, spacing, or interaction state

If a field exists only because one renderer wants it, that field belongs in a downstream layer unless it is reclassified as transcript semantics by architecture review.

---

## DEPENDENCY RULES

The structured transcript contract may consume metadata when helpful.

It must not depend on non-semantic metadata merely to exist.

This is especially important for:

- UFM metadata
- case-management metadata
- presentation-only export settings

The rule is:

- metadata may inform semantic resolution where explicitly justified
- metadata may not become a hidden prerequisite for contract construction unless the architecture explicitly says so

The transcript contract is a semantic layer, not a general project payload.

---

## TESTING REQUIREMENTS

The contract must be protected by targeted tests.

At minimum:

- contract builder tests
- speaker resolution contract tests
- paragraph assembly contract tests
- provenance tests
- role and label stability tests
- consumer tests proving the workspace and export paths consume the contract

Regression tests should specifically prevent:

- duplicate semantic reconstruction
- consumer-local speaker remapping
- consumer-local Q/A inference
- missing provenance
- silent role drift
- silent schema drift

---

## MIGRATION RULES

Migration to this contract must proceed in four phases.

### Phase A — Contract Definition

Define and stabilize the contract shape and semantics.

### Phase B — Producer Consolidation

Move semantic ownership into the designated producers.

This may require:

- extraction
- normalization
- relocation
- compatibility adapters

Behavior-preserving refactors are allowed.
Competing semantic ownership is not.

### Phase C — Consumer Migration

Rewire workspace, export, and related systems to consume only the contract for transcript semantics.

### Phase D — Legacy Removal

Delete legacy semantic reconstruction paths after consumers are verified.

### Migration Safety Rule

Do not delete compatibility layers before all active consumers have migrated and been verified.

Do not keep compatibility layers indefinitely after verification.

---

## IMPLEMENTATION GUIDANCE

The permanent architectural name is the structured transcript contract.

The concrete runtime implementation may remain named `StructuredTranscriptPackage` if that is the least disruptive code-level choice.

If future refactoring introduces a better code name such as `structuredTranscriptContract`, that change is acceptable so long as:

- semantic meanings remain stable
- ownership remains singular
- migration is documented
- consumers remain aligned to the same contract

Naming is secondary.
Semantic authority is the primary concern.

---

## RELATIONSHIP TO LATER WAVE 22 WORK

This contract is the semantic foundation for later layers, including:

- deterministic corrections
- canonical punctuation
- AI contextual review
- Stage S formatting and rendering

Those layers must consume structured semantics.
They must not recreate them independently.

The intended long-term layer model is:

1. Canonical Transcript
2. Structured Transcript Contract
3. Deterministic Corrections
4. AI Context
5. Formatting / Stage S / Export

Nothing should skip across layers without explicit architectural approval.

---

## AUTHORITATIVE SUMMARY

DEPO-PRO has one canonical semantic boundary for transcript meaning after canonical ingestion:

`Structured Transcript Contract`

Upstream producers populate it.
Downstream consumers read it.

No consumer is allowed to independently reinterpret transcript meaning once this contract exists.

That rule is the core architectural decision of W22-2A.

# DEPO-PRO W22-2A

# Structured Transcript Contract Conformance

Canonical authority:

- `docs/architecture/W22-2A_STRUCTURED_TRANSCRIPT_CONTRACT.md`

If any instruction in this prompt conflicts with the canonical contract, the contract wins.

This prompt exists to implement the contract.
It does not redefine it.

## Objective

Bring the transcript pipeline into complete conformance with the structured transcript contract at the contract-definition layer.

This phase establishes the runtime contract shape, its semantic guarantees, and the producer boundaries that later implementation phases will populate and route through.

## Required Outcomes

1. Make the runtime contract artifact explicit and stable in code.
2. Ensure the contract exposes the canonical identity/version fields defined by the architecture document.
3. Ensure the contract exposes resolved speakers, structured units, semantic kind data, provenance, and confidence/review metadata as required by the architecture document.
4. Remove ambiguity about semantic ownership in code comments, naming, and builder responsibilities where doing so is necessary to align implementation with the contract.
5. Add or update tests that lock the contract shape and its invariants.

## Scope

- contract definition and builder behavior
- semantic field alignment to the architecture document
- contract-level tests
- behavior-preserving refactors needed to make ownership real at the contract boundary

## Non-Goals

- no workspace consumer migration
- no export consumer migration
- no Stage S formatting work
- no punctuation changes
- no deterministic correction layer work
- no AI contextual layer work
- no callback-pipeline redesign beyond what is required for contract conformance

## Ownership Expectations

The implementation must conform to the canonical ownership map in the architecture document.

Current expected owners:

- `src/lib/transcript/speakerResolutionEngine.ts`
- `src/lib/transcript/transcriptParagraphs.ts`
- `src/lib/transcript/preWorkspaceStructure.ts`
- `src/lib/transcript/structuredTranscriptPackage.ts`

No new competing semantic owner may be introduced.

## Implementation Rules

1. Search for existing implementations before introducing new code.
2. Extend or consolidate existing owners instead of creating parallel semantic paths.
3. Treat the structured transcript contract as the sole semantic boundary for downstream consumers, even if those consumers are not migrated in this phase.
4. Preserve behavior where possible, but prefer contract correctness over legacy naming or drift.
5. If a current field or helper conflicts with the canonical contract, normalize the implementation toward the contract rather than preserving the conflict.

## Validation

- targeted tests for changed transcript-contract files
- `npx tsc --noEmit -p tsconfig.app.json`
- `npm run build`

## Stop After

- the runtime contract is explicit and test-locked
- ownership at the contract boundary is aligned to the architecture document
- no new parallel semantic owner exists
- the codebase is ready for W22-2B producer migration and W22-2C consumer rewiring

# KEYTERM PHASE 1 VALIDATION

Date: 2026-06-23  
Branch: `feature/stage3-workspace-core`  
Validation target: `etminan_response.json`

## Fixture Basis

This validation used two inputs together:

1. `etminan_response.json`
   - real Deepgram transcript artifact showing recurring transcript entities
2. the Etminan case fixture now codified in the keyterm tests
   - used to generate the current keyterm set deterministically on this branch

Reason:

The workspace contains the transcript artifact, but not a persisted Etminan `CaseRecord` JSON payload. The case fixture matches the visible transcript entities needed for ranking validation.

## Baseline Result

- Derived keyterms included: `37`
- Derived keyterms dropped during derivation: `0`
- Estimated token usage after derivation: `111`
- Request-budget kept count: `37`
- Request-budget dropped count: `0`
- Request-budget estimated tokens: `111`

The Etminan keyterm set is comfortably under both the soft request caps:

- soft term cap: `90`
- soft token cap: `400`

## Top Generated Keyterms

Top ranked output on the current branch:

1. `Etminan` — `derived:witness` — priority `90`
2. `Mohammad` — `derived:witness` — priority `90`
3. `Mohammad Etminan` — `derived:witness` — priority `90`
4. `Mr. Etminan` — `derived:witness` — priority `90`
5. `Ms. Etminan` — `derived:witness` — priority `90`
6. `Christian` — `derived:attorney:sbot` — priority `88.5`
7. `Christian R. Ramon` — `derived:attorney:sbot` — priority `88`
8. `Bentley` — `derived:attorney:sbot` — priority `87.5`
9. `Dennis` — `derived:attorney:sbot` — priority `87.5`
10. `Dennis Bentley` — `derived:attorney:sbot` — priority `87.5`
11. `Ramon` — `derived:attorney:sbot` — priority `87.5`
12. `Bentley Law Group, PLLC` — `derived:firm` — priority `70.8`
13. `Ramon Law Firm, PLLC` — `derived:firm` — priority `70.8`
14. `Quantum Pain` — `derived:medical_provider` — priority `66.7`
15. `Leonardo Isaias Rodriguez` — `derived:caption_entity` — priority `64.2`
16. `Rodriguez` — `derived:caption_entity` — priority `64.2`
17. `Koepke` — `derived:caption_entity` — priority `63`
18. `Leonardo` — `derived:caption_entity` — priority `63`
19. `Rocio` — `derived:caption_entity` — priority `63`
20. `Rocio Laura Elizondo Vargas` — `derived:caption_entity` — priority `63`

## Named Verification Targets

Expected transcript/context entities all resolved into the generated set:

| Target | Present | Notes |
|---|---|---|
| `Mohammad Etminan` | Yes | witness full name |
| `Etminan` | Yes | witness surname |
| `Rocio Laura Elizondo Vargas` | Yes | caption party |
| `Vargas` | Yes | caption surname |
| `Dennis Bentley` | Yes | attorney |
| `Christian R. Ramon` | Yes | attorney |
| `Bentley Law Group, PLLC` | Yes | firm |
| `Ramon Law Firm, PLLC` | Yes | firm |
| `Standing Seam & Specialty Company, Inc.` | Yes | caption organization |
| `Quantum Pain` | Yes | medical provider / organization |
| `Koepke` | Yes | caption surname |

## Terms Promoted

Promoted by the new ranking logic:

- `Christian R. Ramon`
  - promoted by attorney provenance, SBOT-style bar-number signal, and difficult-name bonus
- `Dennis Bentley`
  - promoted by attorney provenance and SBOT-style bar-number signal
- `Bentley Law Group, PLLC`
  - promoted as a firm phrase instead of falling behind generic legal vocabulary
- `Ramon Law Firm, PLLC`
  - promoted as a firm phrase instead of falling behind generic legal vocabulary
- `Quantum Pain`
  - promoted as a medical-provider organization instead of being treated as a generic company token

## Terms Pruned

No Etminan terms were pruned in this validation run.

- derivation dropped count: `0`
- request-budget dropped count: `0`
- UI prune deselections: `0`

## Transcript Cross-Check Against `etminan_response.json`

Recurring transcript-side entities visible in the Deepgram artifact:

- `Etminan`
- `Vargas`
- `doctor Mohammad Etminan`
- `Dennis Bentley`
- `Christian R. Ramon`
- `Quantum Pain`

The generated keyterm set covers those transcript-visible entities without needing schema changes, AI inference, or a second keyterm pipeline.

## Safety Checks

Confirmed:

- no schema changes
- no migrations
- no Deepgram request contract change
- no transcript content mutation
- no AI inference

This phase changes only keyterm selection, integrity enforcement, and ranking behavior.

## Bottom Line

Phase 1 repaired the highest-risk part of the pipeline:

- case/audio mismatches are now rejected before transcription start
- names and entities outrank generic legal terms
- difficult spellings are promoted deterministically
- the Etminan validation set remains comfortably under budget

The keyterm pipeline is still the existing pipeline. This work hardened and prioritized it rather than replacing it.

# KEYTERM PHASE 1 IMPLEMENTATION PLAN

Date: 2026-06-23  
Branch: `feature/stage3-workspace-core`  
HEAD: `e1f3cf0`

## Scope

Phase 1 is limited to request-budget trimming. It does not change derivation, ranking, storage, or Deepgram request shape.

## File

- `src/lib/deepgram/requestBudget.ts`

## Current Behavior

- `fitStoredKeytermsToRequestBudget()` iterates stored keyterms in persisted order.
- Deselected terms are skipped using `readStoredKeytermMeta(notes).selected`.
- Each selected term is admitted if adding it stays within:
  - `DEEPGRAM_KEYTERM_SOFT_TERM_CAP`
  - `DEEPGRAM_KEYTERM_SOFT_TOKEN_CAP`
- Terms that overflow the caps are dropped.
- No entity-tier classification exists.
- No final request-time preservation rule exists for names/entities over generic legal terms.

## Current Risk

The persisted order reaching `requestBudget.ts` can still cause generic deposition/legal terms to consume budget before high-value names and entities. The result is a correct pipeline with the wrong survivors.

## Proposed Behavior

Introduce deterministic request-time classification using existing metadata already present on stored keyterms:

- `Tier 1`
  - witness names
  - attorney names
  - expert names
  - party/person caption entities
- `Tier 2`
  - organizations
  - firms
  - medical providers
- `Tier 3`
  - case identifiers
  - jurisdictions / locations
- `Tier 4`
  - generic legal/deposition terminology

Implementation approach:

1. Decode stored metadata with `readStoredKeytermMeta()`.
2. Derive tier from existing `notes`, `category`, and term content.
3. Reorder selected terms for request-budget fitting by:
   - lower tier number first
   - original stored order preserved within each tier
4. Apply the existing term/token cap logic unchanged.

## Expected Outcome

- Tier 1 and Tier 2 entities survive before Tier 4 boilerplate.
- Existing request caps remain enforced.
- Existing Deepgram request builder and wire format remain unchanged.

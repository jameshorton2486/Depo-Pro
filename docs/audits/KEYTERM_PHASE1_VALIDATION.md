# KEYTERM PHASE 1 VALIDATION

Date: 2026-06-23  
Branch: `feature/stage3-workspace-core`

## Scope

This validation covers request-budget preservation only. It does not change derivation, ranking, storage, or Deepgram request shape.

## Fixture Basis

Validation terms were sourced from the opening Etminan transcript content in `etminan_response.json`, including:

- `Mohammad Etminan`
- `Rocio Laura Elizondo Vargas`
- `Dennis Malley`
- `Christian R. Ramon`
- `Rico Law Firm, PLLC`
- `Standing Seam & Specialty Company, Inc.`
- `Hidalgo County, Texas`
- `Cause Number C572224L`

The overflow set also included generic legal/deposition boilerplate present in the repo's canonical defaults, such as:

- `oral deposition`
- `read and sign`
- `certified court reporter`
- `stenographically`
- `Texas Rules of Civil Procedure`
- `remote video conference`
- `civil action`

## Baseline Scenario

The validation scenario intentionally placed Tier 4 legal boilerplate ahead of Etminan/Vargas entities to reproduce the exact risk identified in `KEYTERM_PHASE1_BASELINE.md`: correct entities exist, but request-budget trimming can still crowd them out.

## Before

Legacy request-budget behavior:

- preserved terms were taken in stored order
- no entity protection existed at request time
- term cap and token cap were still respected

Result:

- token count: `399`
- protected entities surviving:
  - `Mohammad Etminan`
  - `Rocio Laura Elizondo Vargas`
- protected entities lost:
  - `Dennis Malley`
  - `Christian R. Ramon`
  - `Rico Law Firm, PLLC`
  - `Standing Seam & Specialty Company, Inc.`
  - `Hidalgo County, Texas`
  - `Cause Number C572224L`

## After

Current request-budget behavior:

- Tier 1 preserved before Tier 4
- Tier 2 preserved before Tier 4
- Tier 3 preserved before Tier 4
- original order is preserved inside each tier
- term cap and token cap remain unchanged

Result:

- token count: `400`
- protected entities surviving:
  - `Mohammad Etminan`
  - `Rocio Laura Elizondo Vargas`
  - `Dennis Malley`
  - `Christian R. Ramon`
  - `Rico Law Firm, PLLC`
  - `Standing Seam & Specialty Company, Inc.`
  - `Hidalgo County, Texas`
  - `Cause Number C572224L`

## Tier 4 Terms Removed First

Examples displaced by the new preservation logic:

- `oral deposition`
- `read and sign`
- `certified court reporter`
- `stenographically`
- `Texas Rules of Civil Procedure`
- `remote video conference`
- `civil action`

## Explicit Checks

- `Etminan` preserved: yes
- `Vargas` preserved: yes
- attorney names preserved: yes
- firm names preserved: yes
- organization names preserved: yes
- budget limits unchanged: yes
- Deepgram request shape unchanged: yes

## Regression Risk

The classifier is intentionally narrow and uses only metadata already present on stored keyterms:

- derived provenance notes
- existing category
- case-identifier / jurisdiction heuristics

This keeps the change scoped to request-budget ordering rather than creating a new derivation path or a second ranking system.

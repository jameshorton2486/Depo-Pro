# Formatting Regression Root Cause

## Primary cause

Formatting fixes have not remained permanent because the repository has treated formatting as a local parser, screen, or builder responsibility rather than a property of the working field. The same logical value can enter through multiple sources and leave through multiple consumers without passing through one shared policy.

## Regression classifications

| Classification | Evidence | Failure mode |
|---|---|---|
| Duplicate formatter | Reporter phone helper, fallback parser phone logic, UFM normalization, directory values | A fix changes one entity/screen but not the others |
| Projection-only formatting | `fieldProjection` and UI helpers create display values | The screen looks fixed while stored/UFM/export values remain unchanged |
| Builder overwrite/reselection | UFM trims, joins, enriches, and selects profile/directory values | A canonical-looking working value can be replaced downstream |
| Independent wire normalization | Keyterm derivation and Deepgram builder sanitize/dedupe independently | Recognition input differs from Intake display/export spelling |
| Dead/non-authoritative code | `nodParser.ts` contains attractive deterministic casing logic but active upload uses `extract-nod` | A fix is correct in code review yet never executes for users |
| Entry-route bypass | AI extraction, job sheets, profiles, directories, manual edits, hydration | A boundary-specific fix does not cover all updates |
| Confirmation split | Reducer, projection, conflict records, and UFM profile behavior interpret status | A value can look or export as trusted under different rules |
| Branch divergence | Canonical integration branch differs from GitHub default and other feature branches contain work | Correct changes can remain absent from the deployed/merged lineage |
| Legacy structural normalization | Load normalization preserves most strings rather than applying field policy | Old persisted values reappear after reload |
| Domain collision | Intake metadata formatters and transcript/legal document formatters coexist | A transcript formatting change is mistaken for Intake normalization, or vice versa |

## Executed versus obsolete

Executed in the canonical tree: AI `extract-nod`, extraction application, reducer, record normalization on load, field projection, reporter-specific controls, keyterm/Deepgram builders, UFM builder, transcript adapters, and export adapters.

Non-authoritative: the deterministic `nodParser.ts` fallback/reference path for normal AI upload extraction. It may still be useful for tests or fallback operation, but fixes there cannot be represented as production-wide fixes. Code existing only on another branch is also non-executing in this branch.

## Why persistence did not solve it

Persistence stores the current `CaseRecord`; it does not prove the value passed through a canonical policy. On reload, structural normalization restores the shape and generally preserves the stored string. A display-only fix is therefore lost, while a source-specific stored fix can still be bypassed by another source or downstream selector.

## Required response

Stop making field-by-field changes in parser, projection, UFM, or export code. First introduce and adopt one canonical field-policy boundary. Only after all writers and readers are routed through that boundary should obsolete helpers be removed and specific formatting expectations—such as `(210) 999-5033`—be enforced.

This conclusion satisfies the audit stop condition: multiple competing implementations exist, so consolidation is required before additional formatting implementation.


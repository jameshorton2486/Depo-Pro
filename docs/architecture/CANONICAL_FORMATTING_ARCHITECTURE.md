# Canonical Formatting Architecture

---
authority_tier: T2
status: DRAFT
owner: Architecture
scope: canonical-intake-formatting-architecture
supersedes: null
superseded_by: null
approved_by: null
version: 1.0.0
effective_date: null
ratified_date: null
last_reviewed: 2026-08-05
next_review: null
ratification: REVIEW
implementation_status: NOT_STARTED
---

## Required architecture

```text
Raw evidence
  -> field-specific canonical normalization
  -> conflict and confirmation policy
  -> working CaseRecord
  -> read-only consumers
```

Consumers never reformat canonical field values. Output-only layout (for example an enum label or document typography) may decorate a value but must not redefine it.

## Raw layer

Preserve exactly what each source supplied:

- source document text and extraction span/evidence;
- AI response value, confidence, inferred flag, model/version;
- imported profile/directory value;
- manual input before normalization;
- source identity and timestamp.

Raw evidence is immutable provenance. It is not the string displayed or exported by default.

## Canonical normalization layer

Create one pure, typed field-policy registry keyed by canonical field path or field kind. Each policy returns a canonical value and validation result without changing provenance. Example policy families:

- cause number: whitespace, separator, prefix, and casing policy;
- North American phone: digit/extension parsing and canonical `(210) 999-5033` rendering;
- person name: conservative whitespace/punctuation normalization without destructive title-casing;
- firm/organization: whitespace and known-suffix preservation;
- court/caption: legal-aware casing rules with acronym/proper-name exceptions;
- address/location: component normalization, not consumer-specific concatenation;
- date/time: canonical ISO semantic storage and separate fixed display adapter;
- enum/legal term: canonical identifiers with presentation labels.

The registry must be invoked on every route into the working model: AI extraction, deterministic/fallback extraction, job sheet, reporter profile, directory import, manual edit, conflict resolution, and legacy record hydration. A migration/compatibility adapter may normalize old records on load, but its policy must be the same registry rather than another implementation.

## Working model

`CaseRecord` remains the current-value authority. Each leaf should expose the canonical working value plus existing source/confidence/conflict/confirmation data. Raw source text stays in provenance, not in the canonical value. If semantic storage and required display differ (for example phone or date), the field policy owns both through typed accessors; individual screens do not implement them.

The frozen API contract must not be reshaped. Any additional normalization-version or confirmation-method metadata belongs in separate local/audit types and must be logged in `CONTRACT_NOTES.md` during implementation.

## Confirmation layer

Normalization precedes comparison so semantically identical values do not create false conflicts. Conflict detection precedes auto-confirmation. A configurable confirmation policy may auto-confirm eligible, conflict-free extracted fields at `>= 0.95`; all conflicts require explicit resolution. The policy records whether confirmation was manual, automatic, imported-profile, or conflict-resolution.

## Consumer rules

- Field projection reads canonical values and assigns only labels/status.
- Intake controls call canonical parse/format accessors, not local regexes.
- Keyterm derivation reads canonical spellings; keyterm-only token budgeting may remain specialized.
- Deepgram builder performs only protocol encoding, selection, and wire limits.
- UFM builder maps canonical values and provenance; it does not repair casing or phones.
- UFM preview displays the builder result without transformation.
- Transcript creation/workspace consume canonical entity names/terms but retain separate transcript recognition formatting.
- Export adapters perform document layout, not Intake data cleanup.

## Consolidation sequence

1. Add characterization tests for every current entry route and consumer using synthetic fixtures.
2. Specify canonical field policies, especially cause number, phone, caption/court, names, organizations, and location.
3. Implement the pure registry without wiring it.
4. Wire extraction and import boundaries.
5. Wire manual edits and conflict resolution.
6. Wire hydration of legacy records with explicit policy versioning.
7. Centralize conflict/auto-confirm policy after normalization.
8. Convert projections, keyterms, UFM, workspace adapters, and export to read canonical values.
9. Remove reporter-only/general-purpose duplicates or reduce them to calls into the registry.
10. Quarantine the fallback parser’s formatting rules and ensure it emits raw extracted values through the same boundary.
11. Run end-to-end synthetic regression tests before changing production data or defaults.

No individual formatting bug should be changed before steps 1–3 establish the authority.


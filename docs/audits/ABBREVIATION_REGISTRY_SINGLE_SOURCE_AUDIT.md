# Abbreviation Registry Single-Source Audit

Date: 2026-06-24  
Branch: `feature/stage3-workspace-core`  
Mode: audit only

## Scope

This audit checks whether `Canonical Standards Folder/abbreviation_registry.json`
is the single runtime authority for abbreviation-spacing behavior in the live
repo, and whether competing hardcoded abbreviation logic still exists in:

- `src/`
- `reference/wave8/` as a future porting hazard

This is an audit-only pass. No runtime behavior was changed.

## Files inspected

Primary authority and loader:

- [Canonical Standards Folder/abbreviation_registry.json](/C:/Users/james/projects/depo-pro/Canonical%20Standards%20Folder/abbreviation_registry.json)
- [src/lib/format/abbreviationRegistry.ts](/C:/Users/james/projects/depo-pro/src/lib/format/abbreviationRegistry.ts)
- [src/lib/format/types.ts](/C:/Users/james/projects/depo-pro/src/lib/format/types.ts)

Live `src/` consumers and adjacent formatting paths:

- [src/lib/format/cfe.ts](/C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts)
- [src/lib/buildEditorContent.ts](/C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts)
- [src/components/ExportScreen/ExportScreen.tsx](/C:/Users/james/projects/depo-pro/src/components/ExportScreen/ExportScreen.tsx)
- [src/lib/format/cfe.test.ts](/C:/Users/james/projects/depo-pro/src/lib/format/cfe.test.ts)

Reference-only wave8 competing sources:

- [reference/wave8/backend/corrections/typography.py](/C:/Users/james/projects/depo-pro/reference/wave8/backend/corrections/typography.py)
- [reference/wave8/backend/corrections/patterns.py](/C:/Users/james/projects/depo-pro/reference/wave8/backend/corrections/patterns.py)

## Live registry import path

The live import path is:

- [src/lib/format/abbreviationRegistry.ts](/C:/Users/james/projects/depo-pro/src/lib/format/abbreviationRegistry.ts)

It imports:

- `../../../Canonical Standards Folder/abbreviation_registry.json`

and exports:

- `abbreviationRegistry`

typed as `AbbreviationRegistry`.

## Live consumers in `src/`

Confirmed live consumers of the shared registry:

1. [src/lib/buildEditorContent.ts](/C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts)
   - imports `abbreviationRegistry`
   - passes it into `cfe(...)`
   - this is the Stage 3 Workspace display path

2. [src/components/ExportScreen/ExportScreen.tsx](/C:/Users/james/projects/depo-pro/src/components/ExportScreen/ExportScreen.tsx)
   - imports `abbreviationRegistry`
   - passes it into `cfe(...)`
   - this is the current TXT/package export formatting path

3. [src/lib/format/cfe.ts](/C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts)
   - accepts the registry as an explicit function argument
   - derives:
     - `oneSpaceTokens`
     - `oneSpacePatterns`
     - `sentenceBoundaries`
   - uses those derived rules to determine one-space vs two-space behavior

## Hardcoded competing sources in `src/`

### Confirmed live duplication

One live competing source remains inside [src/lib/format/cfe.ts](/C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts):

- `isRegistryToken(...)` hardcodes a special-case branch for `No.`
  - `normalized !== "no."`
  - `^no\.$`
  - `^[A-Za-z0-9(]`

Why this matters:

- the registry already carries `No.` in both:
  - `one_space_tokens.reference`
  - `context_sensitive["No."]`
- the runtime meaning of the `No.` exception therefore lives partly in data and
  partly in code
- that is not a full single-source implementation

### Not counted as abbreviation-authority drift

The following hardcoded sets in `cfe.ts` are real formatting logic, but they do
not constitute competing abbreviation-spacing authorities:

- `FUNCTION_WORDS`
- `COMMON_WORDS`
- `MEDICAL_TERMS`
- `LEGAL_TERMS`
- `ORGANIZATION_SUFFIXES`
- `MONTH_NAMES`
- `DIRECT_ADDRESS_TITLES`
- `SIMPLE_NUMBER_WORDS`

These are adjacent formatting concerns, not abbreviation registry duplication.

## Reference-only competing sources in `reference/wave8/`

The wave8 reference tree still contains its own private abbreviation/honorific
logic and should be treated as a drift hazard if ported later without
reconciliation.

Confirmed competing sources:

1. [reference/wave8/backend/corrections/patterns.py](/C:/Users/james/projects/depo-pro/reference/wave8/backend/corrections/patterns.py)
   - `ABBREV_GUARD`
   - `POST01_ABBREV_RE`
   - `POST03_HONORIFIC_RE`
   - hardcoded tokens such as `Dr`, `Mr`, `Mrs`, `Ms`, `Jr`, `Sr`, `No`, `Vol`, `Corp`, `Inc`, `Ltd`, `St`, `Blvd`, `Ave`, `Ste`

2. [reference/wave8/backend/corrections/typography.py](/C:/Users/james/projects/depo-pro/reference/wave8/backend/corrections/typography.py)
   - `_post01_two_space(...)` depends on `POST01_ABBREV_RE`
   - `_post03_honorifics(...)` applies honorific spacing/casing logic from hardcoded regexes

These are not live in `src/`, but they are clear future porting hazards.

## Test coverage assessment

Current relevant tests are concentrated in:

- [src/lib/format/cfe.test.ts](/C:/Users/james/projects/depo-pro/src/lib/format/cfe.test.ts)

What the tests prove:

- live CFE behavior does use the imported registry object
- one-space behavior after `Mr.` works
- context-sensitive `No.` behavior works
- sentence-boundary spacing works

What the tests do not prove:

- that all abbreviation behavior is sourced only from registry data with no
  code duplication
- that `context_sensitive` entries are interpreted generically from registry
  data rather than via hardcoded token-specific branches
- that future additions to the registry would be automatically honored without
  corresponding code edits

## Audit answers

### 1. Does live code in `src/` read the registry through a shared loader?

Yes.

The shared loader is [src/lib/format/abbreviationRegistry.ts](/C:/Users/james/projects/depo-pro/src/lib/format/abbreviationRegistry.ts).

### 2. Which live paths use that shared registry?

- Stage 3 Workspace render path through [src/lib/buildEditorContent.ts](/C:/Users/james/projects/depo-pro/src/lib/buildEditorContent.ts)
- current export formatting path through [src/components/ExportScreen/ExportScreen.tsx](/C:/Users/james/projects/depo-pro/src/components/ExportScreen/ExportScreen.tsx)
- core spacing logic inside [src/lib/format/cfe.ts](/C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts)

### 3. Which live paths still hardcode abbreviation knowledge?

- [src/lib/format/cfe.ts](/C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts) duplicates the `No.` context-sensitive exception in code

### 4. Are there multiple competing abbreviation-authority implementations in `src/`?

Not multiple full implementations, but there is one meaningful live split of
authority:

- registry-backed token/pattern loading
- code-hardcoded `No.` context logic

### 5. Are there reference-only wave8 hardcoded lists that are future hazards?

Yes.

- [reference/wave8/backend/corrections/patterns.py](/C:/Users/james/projects/depo-pro/reference/wave8/backend/corrections/patterns.py)
- [reference/wave8/backend/corrections/typography.py](/C:/Users/james/projects/depo-pro/reference/wave8/backend/corrections/typography.py)

### 6. Do current tests prove registry consumption, or only behavior?

They prove behavior and confirm the imported registry is used, but they do not
prove a clean single-source design.

### 7. Minimum safe follow-up

Narrow refactor recommended.

Specifically:

- keep the existing shared loader
- keep the existing live consumers
- move the `No.` context-sensitive rule out of token-specific code branches and
  into a cleaner registry-driven interpretation layer, or at minimum isolate it
  behind a named helper that explicitly documents it as registry-backed behavior
- add tests that assert the registry remains the single live authority for
  abbreviation spacing decisions

## Verdict

`PARTIAL`

Why:

- live Stage 3 and export formatting do consume the canonical registry
- there is no second full live abbreviation list in `src/`
- but `No.` remains duplicated as a token-specific hardcoded runtime rule in
  `cfe.ts`, so the repo is not yet a clean single-source implementation

## Exact file list for follow-up patch

Likely minimum safe follow-up:

- [src/lib/format/cfe.ts](/C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts)
- [src/lib/format/cfe.test.ts](/C:/Users/james/projects/depo-pro/src/lib/format/cfe.test.ts)
- optionally [src/lib/format/types.ts](/C:/Users/james/projects/depo-pro/src/lib/format/types.ts) if a small typed helper shape is needed without changing frozen API contract types

## Recommended next action

Run a narrow refactor prompt that:

- leaves runtime behavior unchanged
- keeps registry import wiring intact
- removes or isolates token-specific abbreviation exceptions that duplicate the
  registry's authority
- adds tests proving the registry remains the single live authority for
  abbreviation spacing behavior

## BETA_FREEZE assessment

This follow-up appears safe under BETA_FREEZE if kept narrow:

- no schema changes
- no migrations
- no prompt behavior changes
- no changes outside `src/lib/format/` and its tests

## Verification

- Files under `src/` changed in this audit pass: `none`
- Files outside `docs/audits/` changed in this audit pass: `none`
- Live hardcoded competing abbreviation logic found: `yes`, one token-specific `No.` branch in `src/lib/format/cfe.ts`

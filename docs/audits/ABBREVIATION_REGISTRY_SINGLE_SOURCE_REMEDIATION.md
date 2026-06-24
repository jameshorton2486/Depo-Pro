# Abbreviation Registry Single-Source Remediation

Date: 2026-06-24  
Branch: `feature/stage3-workspace-core`  
Scope: narrow runtime refactor only

## Summary

This remediation closes the live authority split identified in
[ABBREVIATION_REGISTRY_SINGLE_SOURCE_AUDIT.md](/C:/Users/james/projects/depo-pro/docs/audits/ABBREVIATION_REGISTRY_SINGLE_SOURCE_AUDIT.md)
without changing observed formatting behavior.

The specific problem was:

- `Canonical Standards Folder/abbreviation_registry.json` already defined `No.`
  as a context-sensitive abbreviation
- [src/lib/format/cfe.ts](/C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts)
  also hardcoded `No.`-specific branching inline

That meant the runtime meaning of `No.` lived partly in registry data and
partly in token-specific control flow.

## Change made

Updated [src/lib/format/cfe.ts](/C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts) so that:

- spacing rules now derive `contextSensitiveTokens` from the registry
- the `No.` exception is isolated behind a named helper,
  `usesNumberAbbreviationRule(...)`
- the special-case branch is now entered only when the token is marked
  context-sensitive by registry data

This keeps the current `No.` behavior intact while making the runtime path
explicitly registry-backed instead of implicitly token-driven.

## Before / after authority model

Before:

- registry supplied one-space tokens and patterns
- `cfe.ts` independently recognized and handled `No.`

After:

- registry supplies one-space tokens, patterns, and context-sensitive token keys
- `cfe.ts` uses those registry-derived keys to decide when the context-sensitive
  abbreviation branch applies

## Behavior preservation

Confirmed preserved:

- `Mr.` remains one-space
- `No. 12129` remains one-space after `No.`
- `No.  No.` remains two-space sentence behavior
- sentence-boundary spacing remains unchanged

## Validation

Tests added/updated in [src/lib/format/cfe.test.ts](/C:/Users/james/projects/depo-pro/src/lib/format/cfe.test.ts):

- existing `No.` behavior still passes
- custom test fixture proves that removing `No.` from `context_sensitive`
  changes only the context-sensitive branch, demonstrating registry-backed
  control rather than hidden token duplication

Command results:

- `npm run test`
- `npm run typecheck`
- `npm run build`

All must pass for this remediation to be considered complete.

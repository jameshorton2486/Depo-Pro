# Documentation Validation

---
authority_tier: T4
status: ACTIVE
owner: Architecture
scope: documentation-validation-operations
supersedes: null
superseded_by: null
approved_by: null
version: null
effective_date: 2026-08-05
ratified_date: null
last_reviewed: 2026-08-05
next_review: 2027-08-05
ratification: NOT_REQUIRED
implementation_status: VERIFIED
---

## Run the check

```bash
npm run docs:check
```

The same command runs in the repository verification workflow.

## Enforced rules

The [document manifest](../document-manifest.json) is the single inventory of managed project documentation. Every entry has a stable ID, classification, owner, authority scope, review policy, and governance relationships.

The validator checks:

- local links from one Markdown document to another;
- duplicate active T1-T3 authority scopes;
- required metadata fields and controlled vocabulary;
- supersession targets and supersession cycles;
- the six-file root Markdown allowlist;
- missing or duplicate manifest IDs and paths;
- documents missing from or existing outside the manifest;
- missing owners, authority scopes, or authoritative review dates;
- orphaned documents and governance/supersession cycles.

The locked `reference/wave8/` corpus and repository-local `.agents/` skill packages
are outside project-documentation governance and are excluded.

## Metadata baseline

`scripts/documentation-metadata-baseline.json` lists existing documents that predate
the ratified metadata contract. It is a debt baseline, not a general exemption:

- a new document not in the baseline must include complete metadata;
- adding a baseline entry requires deliberate documentation review;
- when metadata is added to a legacy document, remove its baseline entry;
- CI rejects stale baseline entries whose files no longer exist.

To regenerate the baseline during an explicitly reviewed migration:

```bash
node scripts/verify-documentation.mjs --write-metadata-baseline
```

Never regenerate the baseline merely to make an unexplained validation failure pass.
## Generated dependency graph

`npm run docs:graph` reads the manifest and authored Markdown and writes deterministic derived artifacts to `docs/generated/`. The generator never changes the manifest or authored documents.

Generated outputs include the complete document graph, authority tree, governance graph, supersession tree, and dependency report. Each output carries the source manifest SHA-256 and a generated-file marker. Do not edit these files by hand.

`npm run docs:graph:check` compares every generated artifact byte-for-byte with a fresh in-memory build. It fails when an output is missing, stale, or manually changed. `npm run docs:check` runs source-document validation followed by this check.

Graph integrity failures include orphaned authorities, unreachable documents, multiple governance parents, governance or supersession cycles, and missing relationship targets. Unused authority scopes, dead supersession chains, and active references to archived documents are reported as advisory findings.

## Graph schema and tests

The formal graph contract is `scripts/documentation-graph-schema.json`. Generated JSON uses semantic `schema_version` values. Entity and relationship names are closed vocabularies; adding one requires an intentional schema version change.

The relationship vocabulary is `GOVERNANCE`, `SUPERSESSION`, `REFERENCE`, `HIERARCHY`, `REVIEW`, and `OWNERSHIP`. Run `npm run docs:graph:test` to exercise malformed-manifest fixtures covering cycles, duplicate authority, orphan and disconnected documents, multiple parents, missing owners, duplicate IDs, and missing targets.

The generated Mermaid authority view is `docs/generated/document-graph.mmd`. `manifest-history.json` compares the current manifest with the latest committed manifest version whose content differs, keeping its result stable on both sides of a commit. On the initial manifest revision, the baseline is an empty inventory.

## Documentation build system

`npm run docs:build` is the normal author workflow. It validates the canonical manifest, regenerates the graph, navigation indexes, search index, health dashboard, and managed section README files, then verifies all outputs and regression tests.

`npm run docs:check` is the non-mutating CI gate. It fails when any generated output is missing, stale, or manually edited. `npm run docs:generate` performs generation without the complete validation sequence.

Phase 3 outputs are:

- `docs/generated/navigation/*-index.json` for root, architecture, standards, audits, reports, operations, and archive discovery;
- `docs/generated/search-index.json` for title, ID, ownership, authority, keyword, heading, path, and category queries;
- `docs/generated/documentation-health.json` and `.md` for repository health;
- generated `docs/README.md`, `docs/audits/README.md`, `docs/archive/README.md`, and `docs/standards/README.md` navigation.

The generated README paths are excluded as graph-reference inputs, so navigation cannot create a graph dependency cycle.

## Release snapshots

After a release has an assigned identifier and `npm run docs:build` passes, run:

```bash
npm run docs:snapshot -- <release-id>
```

This creates an immutable bundle under `docs/archive/releases/<release-id>/` containing the manifest, graph, combined navigation, search index, health report, and a SHA-256 snapshot inventory. Existing snapshot directories are never overwritten.

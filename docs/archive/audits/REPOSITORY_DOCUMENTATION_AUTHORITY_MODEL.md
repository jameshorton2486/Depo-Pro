# Repository Documentation Authority Model

---
authority_tier: T7
original_authority_tier: T5
status: ARCHIVED
owner: Architecture
scope: repository-documentation-authority-model
supersedes: null
superseded_by: docs/architecture/DOCUMENT_AUTHORITY_REGISTRY.md
approved_by: null
version: null
effective_date: null
ratified_date: null
last_reviewed: 2026-08-05
next_review: null
ratification: NOT_REQUIRED
implementation_status: NOT_APPLICABLE
archive_category: audits
---

## Decision

Repository documentation is organized and governed by **authority**, not by filename, age, or current folder. Location follows knowledge class; it does not establish authority by itself.

This addendum refines the disposition strategy in the repository-root cleanup audit. The item inventory remains valid evidence, but no `MOVE` or `ARCHIVE` recommendation is executable until the authority-freeze process below is complete.

## Authority tiers

| Tier | Knowledge class | Examples | Lifecycle |
|---:|---|---|---|
| 1 | Project Constitution | `README.md`, `AGENTS.md`, master architecture entry, ADR registry, `NUMBERING_REGISTRY.md`, `CANONICAL_STANDARDS_INDEX.md`, `CONTRACT_NOTES.md` | Permanent and highly discoverable; never archived or moved casually |
| 2 | Architecture | System/subsystem ownership, boundaries, ADRs | Living; superseded only through explicit architecture decisions |
| 3 | Standards | Intake, field ownership, transcript, speaker, formatting, rendering, certification | Normative, versioned, and slow-changing |
| 4 | Operations | Deployment, Cloud Build, release, Deepgram, Supabase, recovery | Active while the supported operational workflow exists |
| 5 | Audits | Findings, verification, gap analysis, evidence | Retained; status may become superseded or archived, but evidence is not discarded |
| 6 | Reports | Implementation, remediation, execution, completion, and handoff history | Archived after authority and evidence links are recorded |

Age is not an authority signal. An old active standard remains active. A new document that has already been superseded belongs in the archive.

## Required document banner

Every managed Markdown document should begin with machine-readable metadata equivalent to:

```yaml
---
status: ACTIVE # ACTIVE | SUPERSEDED | ARCHIVED | DRAFT | DEPRECATED
authority: docs/architecture/MASTER_ARCHITECTURE.md
superseded_by: null
date: 2026-08-03
owner: project | architecture | transcript | intake | operations | security
---
```

The schema must be ratified before bulk application. `authority` means the document or standard that governs this document; it is not the author. `superseded_by` is mandatory for `SUPERSEDED` and normally for `DEPRECATED`.

## Permanent indexes

The repository requires three permanent subsystem indexes:

1. `docs/architecture/INDEX.md`
   - maps each subsystem to its governing architecture and ADRs;
   - names ownership boundaries;
   - identifies explicit supersession.
2. `docs/standards/INDEX.md`
   - lists active standards by scope;
   - allows exactly one unexplained active authority per scope;
   - records version and replacement relationships.
3. `docs/audits/INDEX.md`
   - catalogs audits by subsystem;
   - records status, authority evaluated, findings, and follow-up implementation reports;
   - preserves superseded audits as evidence.

## Knowledge graph

`docs/KNOWLEDGE_GRAPH.md` should map knowledge rather than merely list files:

```text
Architecture
  -> Standards
  -> Audits
  -> Implementation
  -> Tests
  -> CI
```

Each governed capability should have one record:

| Capability | Architecture | Standard | Audit evidence | Implementation | Tests | CI gate |
|---|---|---|---|---|---|---|
| Transcript word integrity | governing boundary | immutable-word standard | active audit(s) | source modules | regression suites | named workflow/check |

This makes duplicate authority, orphaned code, missing tests, and unenforced standards visible.

## Root discoverability standard

A new engineer or AI agent cloning the repository must be able to answer without broad search:

1. What constitutes the project?
2. Which architecture governs each subsystem?
3. Which standards govern Intake, Transcript, Speakers, Formatting, Rendering, Certification, Supabase, and Deepgram?
4. Which audits support or challenge those authorities?
5. Which implementation and tests enforce them?
6. Which CI check detects drift?

The cleanup is successful only if those questions become easier to answer. Reducing root item count is secondary.

## Archive taxonomy

```text
docs/archive/
├── architecture/
├── audits/
├── reports/
├── releases/
├── migration/
├── handoffs/
├── deprecated/
└── experiments/
```

Archive placement requires explicit status and authority metadata:

- `architecture/`: superseded architecture with a replacement target;
- `audits/`: superseded or closed evidence, still retained;
- `reports/`: completed implementation/remediation records;
- `releases/`: beta, RC, release, and freeze evidence;
- `migration/`: completed provider/schema/contract migrations;
- `handoffs/`: resolved or historical session handoffs;
- `deprecated/`: explicitly deprecated specifications or instructions;
- `experiments/`: completed prototypes and non-production investigations.

## Root creation policy

Effective immediately as a proposed governance rule, new audits, reports, prompts, handoffs, and status documents belong under `docs/` and must be registered in the corresponding index. New root-level Markdown is reserved for constitutional/discovery documents or a tool-mandated exception approved in architecture review.

## Documentation CI

Before relocation begins, CI should validate:

- broken internal Markdown links and missing referenced paths;
- missing or invalid status/authority banners;
- duplicate active authority for one declared scope;
- missing or invalid `superseded_by` targets;
- circular authority or supersession relationships;
- managed documents absent from their required index;
- orphaned index and knowledge-graph entries;
- knowledge-graph targets that do not exist;
- unauthorized new root-level Markdown.

These checks should report precise paths and remain deterministic. A temporary allowlist may cover documents awaiting the banner migration, but it must shrink monotonically.

## Standards-folder boundary

`Canonical Standards Folder/` is a mixed authority/runtime boundary. It must not be treated as a documentation-only move.

1. Freeze active standards and supersession relationships.
2. Move active standards to `docs/standards/` only after indexes and banners exist.
3. Separately move `abbreviation_registry.json` to a stable runtime-data location.
4. Update TypeScript imports, tests, build inputs, and authority links atomically.
5. Archive deprecated standards, changelogs, prompts, authoring artifacts, and experiments according to explicit status.
6. Retire the old folder name only after runtime and documentation migrations both pass.

`reference/wave8/` remains read-only and outside this migration.

## Effect on the original inventory

- `KEEP` remains a defensible present-location conclusion.
- `MOVE` means “candidate location after authority freeze and indexing,” not permission to move.
- `ARCHIVE` is provisional until status and supersession are established from content and authority—not chronology.
- `DELETE` remains limited to untracked/generated/local artifacts with recovery evidence and human confirmation.
- `INVESTIGATE` remains a stop condition.

No tracked document should be deleted as part of root cleanup.

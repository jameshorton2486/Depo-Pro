# Depo-Pro Documentation

This directory contains the project’s architecture, standards, operational guidance,
audit evidence, implementation prompts, and historical records.

Before changing application code, read [AGENTS.md](../AGENTS.md) and the
[Master Architecture](architecture/MASTER_ARCHITECTURE.md). When documents conflict,
those governing documents define the applicable precedence. The ratified [Document Authority Registry](architecture/DOCUMENT_AUTHORITY_REGISTRY.md) and [Project Authority Index](architecture/PROJECT_AUTHORITY_INDEX.md) govern documentation status and navigation.

## Manifest

[`document-manifest.json`](document-manifest.json) is the single inventory of every managed project document. CI rejects unregistered, missing, duplicate, or orphaned entries.

## Generated artifacts

The [generated documentation area](generated/) contains deterministic dependency and authority graphs derived from the manifest. Regenerate it with `npm run docs:graph`; never edit generated files by hand.

## Documentation map

| Area | Purpose |
|---|---|
| [Architecture](architecture/) | Governing architecture, contracts, decisions, and implementation maps |
| [AI transcript intelligence](atia/) | AI correction architecture, provider boundaries, and audit evidence |
| [AI pipeline specifications](ai-pipeline-spec/) | Specifications for transcript-analysis engines and review workflows |
| [Audits](audits/) | Point-in-time findings, validation evidence, and implementation assessments |
| [Standards](standards/) | Ratified standards and clearly marked draft standard candidates |
| [Operations](operations/) | Deployment, release, recovery, and production runbooks |
| [Dashboard](dashboard/) | Release and transcript-quality status views |
| [Benchmark](benchmark/) | Benchmark methodology and results |
| [Prompts](prompts/) | Retained implementation and remediation prompts |
| [Reconciliation](reconciliation/) | Branch and implementation reconciliation records |
| [Archive](archive/) | Completed reports and historical handoffs retained for traceability |

## Root-document policy

The repository root is reserved for documents needed at first contact or at fixed
paths by project governance and tooling:

- `README.md`
- `AGENTS.md`
- `ARCHITECTURE_DECISIONS.md`
- `CONTRACT_NOTES.md`
- `CANONICAL_STANDARDS_INDEX.md`
- `NUMBERING_REGISTRY.md`

New audits, reports, plans, and handoffs belong in the appropriate `docs/`
subdirectory. Historical material should be archived rather than deleted when it
provides useful engineering or decision evidence.

## Document status

Treat architecture and standards as authoritative only when their own status and
the governing indexes identify them as current. Audit and archive documents are
evidence from a particular point in time; they do not override current contracts,
architecture, or runtime behavior.

## Validation

Run `npm run docs:check` before committing documentation changes. See the [documentation validation runbook](operations/DOCUMENTATION_VALIDATION.md) for enforced rules and the legacy metadata baseline policy.

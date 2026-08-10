<!-- GENERATED FILE. DO NOT EDIT. Run npm run docs:build. -->
# Depo-Pro Documentation

The [document manifest](document-manifest.json) is the canonical documentation inventory. Navigation, search, graphs, and health reports are deterministic build products.

Before changing application code, read [AGENTS.md](../AGENTS.md) and the [Master Architecture](architecture/MASTER_ARCHITECTURE.md).

## Documentation areas

| Area | Documents | Generated index |
| --- | ---: | --- |
| Architecture | 49 | [architecture-index.json](generated/navigation/architecture-index.json) |
| Standards | 2 | [standards-index.json](generated/navigation/standards-index.json) |
| Audits | 136 | [audits-index.json](generated/navigation/audits-index.json) |
| Reports | 30 | [reports-index.json](generated/navigation/reports-index.json) |
| Operations | 7 | [operations-index.json](generated/navigation/operations-index.json) |
| Archive | 44 | [archive-index.json](generated/navigation/archive-index.json) |

## Authority documents

| Document | ID | Tier | Status | Owner |
| --- | --- | --- | --- | --- |
| [AGENTS.md — House Rules for Bolt / AI Agents](../AGENTS.md) | DOC-0001 | T1 | ACTIVE | Architecture |
| [Architecture Decisions](../ARCHITECTURE_DECISIONS.md) | DOC-0002 | T2 | ACTIVE | Architecture |
| [Canonical Standards Index](../CANONICAL_STANDARDS_INDEX.md) | DOC-0003 | T3 | ACTIVE | Rendering |
| [CONTRACT_NOTES — API Contract Deviations Log](../CONTRACT_NOTES.md) | DOC-0004 | T2 | ACTIVE | Architecture |
| [Numbering Registry](../NUMBERING_REGISTRY.md) | DOC-0021 | T3 | ACTIVE | Rendering |
| [Depo-Pro](../README.md) | DOC-0022 | T1 | ACTIVE | Project |
| [DATA FIELD REFERENCE](DATA_FIELD_REFERENCE.md) | DOC-0039 | T3 | ACTIVE | Intake |
| [Depo-Pro Data Structures & JSON Schemas](DATA_STRUCTURES_REFERENCE.md) | DOC-0040 | T3 | ACTIVE | Transcript |
| [Document Authority Registry](architecture/DOCUMENT_AUTHORITY_REGISTRY.md) | DOC-0062 | T1 | ACTIVE | Architecture |
| [DEPO-PRO MASTER ARCHITECTURE DOCUMENT](architecture/MASTER_ARCHITECTURE.md) | DOC-0068 | T1 | ACTIVE | Architecture |
| [Project Authority Index](architecture/PROJECT_AUTHORITY_INDEX.md) | DOC-0071 | T1 | ACTIVE | Architecture |
| [DEPO-PRO Project Charter](architecture/PROJECT_CHARTER.md) | DOC-0072 | T1 | ACTIVE | Project |

## Generated discovery

- [Documentation health](generated/documentation-health.md)
- [Search index](generated/search-index.json)
- [Document graph](generated/dependency-report.md)
- [Mermaid authority graph](generated/document-graph.mmd)

## Build

Run `npm run docs:build` after changing the manifest or authored documentation. CI runs `npm run docs:check` to reject stale generated outputs.

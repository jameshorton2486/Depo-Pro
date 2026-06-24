# Numbering Registry

Date: 2026-06-23  
Purpose: canonical namespace registry for standards, architecture decisions, and wave records

## Namespace Rules

- `DP-###`
  - reserved for standards / decision records governing formatting, transcript behavior, or canonical content/format policy
- `ADR-###`
  - reserved for architecture decisions
- `WAVE-##`
  - reserved for implementation-wave or architecture-program records

Rules:

- numbers are never reused
- a document must be registered before it is cited
- historical and superseded records remain registered
- collisions are repaired by reclassification, not by silent duplication

## Registered Documents

| Document ID | Title | Status | Owner | Authority Area |
|---|---|---|---|---|
| `DP-009` | Honorific and Abbreviation Spacing | `HISTORICAL` | Standards owner | Historical spacing record |
| `DP-010` | Sentence Boundary & Abbreviation Spacing | `APPROVED` | Standards owner | Spacing authority |
| `DP-011` | Canonical Geometry Authority | `APPROVED` | Standards owner | Geometry authority |
| `DP-012` | Quotation Punctuation, Date Reconciliation & Inline Garble Flags | `APPROVED` | Standards owner | Punctuation, formatting normalization, garble flagging, paragraph refinements, direct-address capitalization |
| `ADR-###` | No registered ADR documents in repository at time of cleanup | `RESERVED` | Architecture owner | Architecture-decision namespace |
| `WAVE-21` | Canonical Export Architecture | `HISTORICAL` | Architecture owner | Architecture-program record |

## Reserved / Unregistered IDs

| Document ID | Title | Status | Owner | Authority Area |
|---|---|---|---|---|
| `DP-001` through `DP-008` | Not registered in current repository corpus | `UNREGISTERED` | Standards owner | Reserved DP namespace |
| `DP-013+` | Unassigned | `AVAILABLE` | Standards owner | Future standards |
| `ADR-001+` | Unassigned | `AVAILABLE` | Architecture owner | Future architecture decisions |
| `WAVE-01` through `WAVE-20` | Not registered in this cleanup registry as live canonical records | `UNREGISTERED/HISTORICAL` | Architecture owner | Legacy wave namespace |
| `WAVE-22+` | Unassigned | `AVAILABLE` | Architecture owner | Future wave records |

## Collision Resolution

### DP-011

Resolved meaning:

- `DP-011` = geometry authority only

Historical conflicting usage:

- some repository documents referred to `DP-011` as the direct-address-capitalization authority

Registry disposition:

- those references are invalid historical references
- direct-address capitalization is now housed in `DP-012`
- `DP-011` remains geometry only and must not be cited for capitalization

### DP-012 / Wave Architecture Label Collision

The geometry authority itself notes a historical collision where an architecture/migration report was labeled as `DP-012`.

Registry disposition:

- `DP-012` is reserved for the punctuation / garble standards document only
- architecture-program material belongs in the `ADR-###` or `WAVE-##` namespace
- the registered wave-side equivalent is `WAVE-21`
- the historical architecture record is now filed as `WAVE21_CANONICAL_EXPORT_ARCHITECTURE.md`

## Ownership Model

| Namespace | Owner |
|---|---|
| `DP-###` | Standards owner |
| `ADR-###` | Architecture owner |
| `WAVE-##` | Architecture owner |

If the same human owns more than one namespace, the namespaces remain distinct anyway.

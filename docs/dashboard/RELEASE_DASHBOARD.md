# Release Dashboard

**Purpose:** One-page executive status for the path to a DEPO-PRO release candidate.

| Area | Status | Exit condition |
|---|---|---|
| Repository stabilization | 🟢 | Governance PR merged; remaining local work is drained through focused PRs. |
| CI | 🟢 | Required checks are green on the authoritative branch and each active PR. |
| Wave 23B — Canonical Integrity | 🟢 | Merged in PR #7. |
| Wave 23C — Proceedings | 🟢 | Merged in PR #8. |
| Structured Transcript Core | 🟡 | Core types, regions, and Q/A utility are merged before paragraph production. |
| Wave 23D — Examination State Machine | ⚪ | Examination ownership/transition exit criteria pass after core and paragraph production. |
| Wave 23E — Dialogue Production | ⚪ | Dialogue production exit criteria pass. |
| Validation | ⚪ | Synthetic and secure validation evidence recorded for implemented PRs. |
| Release candidate | ⚪ | Clean, reviewed, green candidate branch with release notes and rollback reference. |
| Main reconciliation | ⚪ | All reconciliation-gate conditions in the Commit Assembly Plan are met. |

## Status legend

- 🟢 Complete / healthy
- 🟡 Active or awaiting review
- ⚪ Not started
- 🔴 Blocked

Update this page only when a PR changes a release-gate state. Do not use it for planning detail; use the Commit Assembly Plan and Transcript Quality Scorecard for evidence.

# Repository Root Cleanup Audit

## Executive conclusion

The root is operationally healthy but documentation-heavy. Active source, deployment, reference, benchmark, and toolchain entries generally belong at root. The tracked Markdown report/audit corpus can largely be moved or archived without changing its content, but all link/script updates must occur atomically in a later implementation. Eleven untracked generated/local artifacts are deletion candidates. Two untracked directories require human review because they can contain sensitive legal inputs or machine-specific client identifiers.

## Repository verification

| Check | Result |
|---|---|
| Current branch | `perf/lazy-load-stage-screens` |
| HEAD | `e1ad8d0460d38a1c37f42130333933350ce9def6` |
| Upstream | `origin/feature/stage3-workspace-core` |
| Integration branch | `feature/stage3-workspace-core` at `49d32c4eacfc6b2cf667b0d6a1050dacd90835b4` |
| Default branch | `origin/main` |
| Working tree before this audit | Existing untracked audit documents from the preceding task; preserved |
| Root population | 122 entries: 28 directories, 94 files |

The audit is on a feature branch whose upstream is the stated integration branch, not directly on the integration commit. Recommendations are based on the checked-out state.

## Documentation conventions

The repository already has suitable categories: `docs/architecture`, `docs/audits`, `docs/operations`, `docs/reconciliation`, `docs/standards`, and `docs/archive`. The archive currently contains standards material; expanding it with `audits`, `reports`, `handoffs`, and `status` subcategories is justified by the large historical corpus. `docs/audits` is the established location for evidence-backed audits. Root authority exceptions are deliberate: `AGENTS.md`, `README.md`, `ARCHITECTURE_DECISIONS.md`, `CONTRACT_NOTES.md`, `CANONICAL_STANDARDS_INDEX.md`, and `NUMBERING_REGISTRY.md` have discovery, locked-path, script, or authority dependencies.

## Active dependency findings

- `benchmark.json` is imported by `BenchmarkScreen` and is the CLI benchmark default.
- `Canonical Standards Folder/abbreviation_registry.json` is imported by live TypeScript modules. The directory is not merely documentation.
- `ARCHITECTURE_DECISIONS.md` is linked by the operating standard and named by remediation scripts/prompts.
- `CONTRACT_NOTES.md` is required by `AGENTS.md`, source comments, data references, and AI remediation logs.
- `CANONICAL_STANDARDS_INDEX.md` and `NUMBERING_REGISTRY.md` are the declared standards/index authorities with many links.
- `ai_logs` is the configured remediation output/history path; relocation requires script defaults and documentation to change together.
- Formatter/finalizer directories are active deployable services referenced by Cloud Build and runbooks.
- `reference/wave8` remains a locked, read-only normative source.

## Duplication and supersession groups

| Group | Documents | Authority / disposition |
|---|---|---|
| Auth/RLS | `docs/audits/AUTH_RLS_AUDIT.md`, `docs/archive/reports/AUTH_RLS_REPORT.md` | Keep audit active under `docs/audits`; archive remediation/verification report. |
| Intake UI and ownership | `docs/audits/INTAKE_SCREEN_AUDIT.md`, `docs/archive/reports/INTAKE_SCREEN_OWNERSHIP_REPORT.md`, `docs/audits/INTAKE_UI_AUDIT.md`, `docs/archive/reports/INTAKE_UI_FIXES_REPORT.md` | Preserve audits under `docs/audits`; archive implementation/ownership snapshots. Current code/tests remain truth. |
| Intake lifecycle | `docs/audits/INTAKE_REAL_VS_MOCK_AUDIT.md`, `docs/archive/reports/INTAKE_REAL_REPORT.md`, `docs/audits/INTAKE_END_TO_END_VALIDATION_AUDIT.md`, `docs/audits/INTAKE_LIFECYCLE_INTEGRITY_AUDIT.md` | Later end-to-end/integrity audits are strongest evidence; archive point-in-time real-mode report. |
| Deepgram pipeline | Root Deepgram reports plus newer `docs/audits/CURRENT_TRANSCRIPT_PIPELINE.md` and post-Deepgram audits | Newer checked-in pipeline audits are current descriptions; archive old reports, retain go-live checklist as operations. |
| Certification/export | End-to-end audit, remediation report, lock remediation, owner audits, newer RC audits | Keep ownership/integrity audits active; archive completed remediation reports. Runtime and master architecture govern. |
| Canonical geometry/standards | Root reconciliation/index/registry; `Canonical Standards Folder` DP standards and changelogs | DP-010/011/012 plus JSON registry and root index/registry are authorities. Reconciliation is supporting rationale; changelogs/legacy formatter specs are historical. |
| Stage/person roles | `STAGE_0_5_REPORT` through `STAGE_5_*` | Individual audits remain evidence; completion/status reports are historical. Master architecture governs stage order. |
| Correction pipeline | Root transcript findings plus newer `docs/audits/WORKSPACE_TRANSCRIPT_PIPELINE_AUDIT.md` and correction consolidation reports | Newer audits are current evidence; root findings move to audits but should be marked point-in-time. |

No tracked document was judged valueless enough to delete. Git history alone is not a substitute for discoverable audit/legal engineering evidence.

## Sensitive and generated artifact review

| Path | Finding | Classification |
|---|---|---|
| `.env` | Expected ignored secret file. Values were not inspected or reported. | KEEP untracked; verify permissions and never commit. |
| `.aider.chat.history.md`, `.aider.input.history` | Local prompt history may contain sensitive context. | DELETE locally after human confirmation; never commit. |
| `Audit/` | Harness supports real notices/job sheets and local AI credentials; current ownership/data state is unclear. | INVESTIGATE and contain. |
| `tools/` | Untracked script contains machine-specific paths with apparent client/project identifiers; bytecode is also present. | INVESTIGATE; sanitize or relocate outside repo before any tracking. |
| `.tmp`, `dist`, `node_modules`, `test-results`, Bolt/Vercel/Aider caches | Generated or local artifacts, ignored/reproducible. | DELETE candidates. |
| `benchmark-corpus/manifest.json` | Tracked manifest contains null private-input placeholders and explicit synthetic/de-identified policy. | KEEP; continue policy enforcement. |
| `reference/wave8/docs/ufm_audit/...` | Tracked DOCX/PDF sample artifacts exist in normative reference. | KEEP under locked reference, but conduct a separate provenance/privacy review if not already documented. |

The filename scan did not establish committed credentials. It did identify legal-document-like artifacts in the locked Wave8 reference; because provenance cannot be proven from this audit, they are not deletion candidates.

## Delete-candidate proof

| Candidate | Not required / reproducibility | References and effect | Recovery |
|---|---|---|---|
| `.aider.tags.cache.v4` | Untracked cache, matched by `.aider*` ignore | No tracked dependency; Aider may rebuild slowly | Reindex with Aider |
| `.claude` | Untracked local settings | Local tool preferences only; confirm before removal | Reconfigure Claude locally |
| `.tmp` | Ignored scratch tree | Diagnostics may be lost, application unaffected | Rerun diagnostics or restore from local backup |
| `.vercel` | Ignored project link metadata | Local CLI must relink | `vercel link` / approved project setup |
| `bolt_export` | Ignored exported ZIP | No runtime effect | Re-export from Bolt/source |
| `dist` | Ignored Vite output | No source effect | `npm run build` |
| `node_modules` | Ignored dependencies | Local commands unavailable until reinstall | `npm ci` |
| `test-results` | Ignored test/dev output | Loses recent diagnostics only | Rerun tests/dev verification |
| malformed pytest temp directory | Empty and untracked | None | Not needed |
| Aider history files | Untracked ignored histories | Loses local conversational history | Local backup if desired |

Deletion is not authorized by this audit. In particular, `.claude`, `.tmp`, `.vercel`, and AI histories require a human check for unique local value first.

## Stop conditions

Execution must stop for human review before touching `Audit/`, `tools/`, `.env`, or legal-document-like reference samples. Moving root authorities also requires explicit approval because scripts and documentation contain exact paths. No migrations, history rewrites, source changes, or external-service actions are part of this audit.

# Root Document Disposition — 2026-08-05

---
authority_tier: T5
status: ACTIVE
owner: Architecture
scope: repository-root-markdown-classification
supersedes: docs/audits/REPOSITORY_ROOT_INVENTORY.md
superseded_by: null
approved_by: null
version: null
effective_date: 2026-08-05
ratified_date: null
last_reviewed: 2026-08-05
next_review: null
ratification: NOT_REQUIRED
implementation_status: VERIFIED
---

## Outcome

Every tracked Markdown file that existed at the repository root was reviewed. Permanent
discovery and fixed-path authorities remain at root. Operational guidance, active audit
evidence, draft architecture/standards, and historical records now have explicit homes.

This disposition records classification; it does not elevate draft architecture or
standards, and archived records never govern current behavior.

## File-by-file disposition

| Original root file | Tier | Status | Decision | Basis |
|---|---:|---|---|---|
| `AGENTS.md` | T1 | ACTIVE | Keep at root | Locked agent and contributor rules |
| `ARCHITECTURE_DECISIONS.md` | T2 | ACTIVE | Keep at root | Established decision registry and tooling dependency |
| `ARRAY_FIELD_PERSIST_FIX_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/ARRAY_FIELD_PERSIST_FIX_REPORT.md` | Historical evidence retained outside active documentation |
| `ATOMICITY_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/ATOMICITY_AUDIT.md` | Point-in-time audit or engineering evidence |
| `ATTORNEY_KEYTERM_VERIFICATION.md` | T7 | ARCHIVED | Move to `docs/archive/reports/ATTORNEY_KEYTERM_VERIFICATION.md` | Historical evidence retained outside active documentation |
| `ATTORNEY_UFM_MAPPING_TABLE.md` | T5 | ACTIVE | Move to `docs/audits/ATTORNEY_UFM_MAPPING_TABLE.md` | Point-in-time audit or engineering evidence |
| `AUDIO_READINESS_FIX_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/AUDIO_READINESS_FIX_REPORT.md` | Historical evidence retained outside active documentation |
| `AUTH_RLS_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/AUTH_RLS_AUDIT.md` | Point-in-time audit or engineering evidence |
| `AUTH_RLS_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/AUTH_RLS_REPORT.md` | Historical evidence retained outside active documentation |
| `BACKEND_WIRING_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/BACKEND_WIRING_REPORT.md` | Historical evidence retained outside active documentation |
| `BETA_FREEZE.md` | T7 | ARCHIVED | Move to `docs/archive/status/BETA_FREEZE.md` | Historical evidence retained outside active documentation |
| `BINDING_CONFIRM_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/BINDING_CONFIRM_REPORT.md` | Historical evidence retained outside active documentation |
| `BRANCH_STATE_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/repository/BRANCH_STATE_REPORT.md` | Historical evidence retained outside active documentation |
| `CANONICAL_FIELD_GOVERNANCE.md` | T3 | DRAFT | Move to `docs/standards/CANONICAL_FIELD_GOVERNANCE.md` | Domain standard candidate pending ratification |
| `CANONICAL_FORMATTING_ARCHITECTURE.md` | T2 | DRAFT | Move to `docs/architecture/CANONICAL_FORMATTING_ARCHITECTURE.md` | Architecture or design candidate pending scope ratification |
| `CANONICAL_STANDARDS_INDEX.md` | T3 | ACTIVE | Keep at root | Established standards route and migration dependency |
| `CASE_STYLE_TERMINOLOGY_FINDINGS.md` | T7 | ARCHIVED | Move to `docs/archive/audits/CASE_STYLE_TERMINOLOGY_FINDINGS.md` | Historical evidence retained outside active documentation |
| `CERTIFICATION_EXPORT_END_TO_END_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/CERTIFICATION_EXPORT_END_TO_END_AUDIT.md` | Point-in-time audit or engineering evidence |
| `CERTIFICATION_EXPORT_REMEDIATION_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/CERTIFICATION_EXPORT_REMEDIATION_REPORT.md` | Historical evidence retained outside active documentation |
| `CERTIFICATION_LOCK_REMEDIATION.md` | T5 | ACTIVE | Move to `docs/audits/CERTIFICATION_LOCK_REMEDIATION.md` | Point-in-time audit or engineering evidence |
| `CERTIFICATION_OWNER_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/CERTIFICATION_OWNER_AUDIT.md` | Point-in-time audit or engineering evidence |
| `CFE_PHASE0_FINDINGS.md` | T5 | ACTIVE | Move to `docs/audits/CFE_PHASE0_FINDINGS.md` | Point-in-time audit or engineering evidence |
| `COLLOQUY_RENDER_FINDINGS.md` | T5 | ACTIVE | Move to `docs/audits/COLLOQUY_RENDER_FINDINGS.md` | Point-in-time audit or engineering evidence |
| `CONFIDENCE_PERSISTENCE_FIX_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/CONFIDENCE_PERSISTENCE_FIX_REPORT.md` | Historical evidence retained outside active documentation |
| `CONFIRMATION_FLOW_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/CONFIRMATION_FLOW_AUDIT.md` | Point-in-time audit or engineering evidence |
| `CONTRACT_NOTES.md` | T2 | ACTIVE | Keep at root | Frozen API deviation log required by AGENTS.md |
| `CORRECTION_RECORDING_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/CORRECTION_RECORDING_AUDIT.md` | Point-in-time audit or engineering evidence |
| `DATA_REALITY_FINDINGS.md` | T5 | ACTIVE | Move to `docs/audits/DATA_REALITY_FINDINGS.md` | Point-in-time audit or engineering evidence |
| `DEEPGRAM_GO_LIVE_CHECKLIST.md` | T4 | ACTIVE | Move to `docs/operations/DEEPGRAM_GO_LIVE_CHECKLIST.md` | Operational procedure or maintenance plan |
| `DEEPGRAM_PIPELINE_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/DEEPGRAM_PIPELINE_REPORT.md` | Historical evidence retained outside active documentation |
| `DEEPGRAM_WIRE_PARAMS_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/DEEPGRAM_WIRE_PARAMS_REPORT.md` | Historical evidence retained outside active documentation |
| `DEPO_EDITOR_BACKEND_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/DEPO_EDITOR_BACKEND_AUDIT.md` | Point-in-time audit or engineering evidence |
| `DEPO_PRO_SESSION_HANDOFF_2026-06-24.md` | T7 | ARCHIVED | Move to `docs/archive/handoffs/DEPO_PRO_SESSION_HANDOFF_2026-06-24.md` | Historical evidence retained outside active documentation |
| `DURABLE_MOCK_PERSISTENCE_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/DURABLE_MOCK_PERSISTENCE_REPORT.md` | Historical evidence retained outside active documentation |
| `EDITOR_BASE_URL_FIX_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/EDITOR_BASE_URL_FIX_REPORT.md` | Historical evidence retained outside active documentation |
| `EDITOR_LOAD_FAILURE_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/EDITOR_LOAD_FAILURE_AUDIT.md` | Point-in-time audit or engineering evidence |
| `ERROR_COVERAGE_MATRIX.md` | T5 | ACTIVE | Move to `docs/audits/ERROR_COVERAGE_MATRIX.md` | Point-in-time audit or engineering evidence |
| `EXPORT_ADAPTER_OWNER_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/EXPORT_ADAPTER_OWNER_AUDIT.md` | Point-in-time audit or engineering evidence |
| `FIND_WORD_AT_TIME_FIX_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/FIND_WORD_AT_TIME_FIX_REPORT.md` | Historical evidence retained outside active documentation |
| `FORMATTER_OWNER_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/FORMATTER_OWNER_AUDIT.md` | Point-in-time audit or engineering evidence |
| `FORMATTING_FUNCTION_INVENTORY.md` | T5 | ACTIVE | Move to `docs/audits/FORMATTING_FUNCTION_INVENTORY.md` | Point-in-time audit or engineering evidence |
| `FORMATTING_PIPELINE_MAP.md` | T5 | ACTIVE | Move to `docs/audits/FORMATTING_PIPELINE_MAP.md` | Point-in-time audit or engineering evidence |
| `GATE1_REMEDIATION_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/GATE1_REMEDIATION_REPORT.md` | Historical evidence retained outside active documentation |
| `GEOMETRY_AUTHORITY_RECONCILIATION.md` | T5 | ACTIVE | Move to `docs/reconciliation/GEOMETRY_AUTHORITY_RECONCILIATION.md` | Reconciliation evidence |
| `GITHUB_CLEANUP_PLAN.md` | T4 | ACTIVE | Move to `docs/operations/GITHUB_CLEANUP_PLAN.md` | Operational procedure or maintenance plan |
| `INTAKE_END_TO_END_VALIDATION_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/INTAKE_END_TO_END_VALIDATION_AUDIT.md` | Point-in-time audit or engineering evidence |
| `INTAKE_FORMATTING_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/INTAKE_FORMATTING_AUDIT.md` | Point-in-time audit or engineering evidence |
| `INTAKE_LIFECYCLE_INTEGRITY_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/INTAKE_LIFECYCLE_INTEGRITY_AUDIT.md` | Point-in-time audit or engineering evidence |
| `INTAKE_REAL_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/INTAKE_REAL_REPORT.md` | Historical evidence retained outside active documentation |
| `INTAKE_REAL_VS_MOCK_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/INTAKE_REAL_VS_MOCK_AUDIT.md` | Point-in-time audit or engineering evidence |
| `INTAKE_SCREEN_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/INTAKE_SCREEN_AUDIT.md` | Point-in-time audit or engineering evidence |
| `INTAKE_SCREEN_OWNERSHIP_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/INTAKE_SCREEN_OWNERSHIP_REPORT.md` | Historical evidence retained outside active documentation |
| `INTAKE_UFM_GAP_ANALYSIS.md` | T5 | ACTIVE | Move to `docs/audits/INTAKE_UFM_GAP_ANALYSIS.md` | Point-in-time audit or engineering evidence |
| `INTAKE_UI_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/INTAKE_UI_AUDIT.md` | Point-in-time audit or engineering evidence |
| `INTAKE_UI_FIXES_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/INTAKE_UI_FIXES_REPORT.md` | Historical evidence retained outside active documentation |
| `KEYTERM_EXPANSION_NOTES.md` | T7 | ARCHIVED | Move to `docs/archive/reports/KEYTERM_EXPANSION_NOTES.md` | Historical evidence retained outside active documentation |
| `KEYTERM_PIPELINE_FINDINGS.md` | T5 | ACTIVE | Move to `docs/audits/KEYTERM_PIPELINE_FINDINGS.md` | Point-in-time audit or engineering evidence |
| `MIGRATION_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/MIGRATION_AUDIT.md` | Point-in-time audit or engineering evidence |
| `MOUNT_CONTRACT_MIGRATION_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/MOUNT_CONTRACT_MIGRATION_REPORT.md` | Historical evidence retained outside active documentation |
| `MULTIFILE_BUILD_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/MULTIFILE_BUILD_REPORT.md` | Historical evidence retained outside active documentation |
| `MULTIFILE_TRANSCRIPTION_DESIGN.md` | T2 | DRAFT | Move to `docs/architecture/MULTIFILE_TRANSCRIPTION_DESIGN.md` | Architecture or design candidate pending scope ratification |
| `NUMBERING_REGISTRY.md` | T3 | ACTIVE | Keep at root | Canonical standards numbering |
| `PARTICIPANT_IMPLEMENTATION_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/PARTICIPANT_IMPLEMENTATION_AUDIT.md` | Point-in-time audit or engineering evidence |
| `PARTICIPANT_MODAL_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/PARTICIPANT_MODAL_AUDIT.md` | Point-in-time audit or engineering evidence |
| `PRE_RC_CHECKLIST.md` | T7 | ARCHIVED | Move to `docs/archive/status/PRE_RC_CHECKLIST.md` | Historical evidence retained outside active documentation |
| `PROVIDER_MIGRATION_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/PROVIDER_MIGRATION_REPORT.md` | Historical evidence retained outside active documentation |
| `RC_HARDENING_OWNER_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/RC_HARDENING_OWNER_AUDIT.md` | Point-in-time audit or engineering evidence |
| `README.md` | T1 | ACTIVE | Keep at root | Repository discovery and setup |
| `REGRESSION_ROOT_CAUSE.md` | T5 | ACTIVE | Move to `docs/audits/REGRESSION_ROOT_CAUSE.md` | Point-in-time audit or engineering evidence |
| `REPOSITORY_BRANCH_CENSUS.md` | T7 | ARCHIVED | Move to `docs/archive/reports/repository/REPOSITORY_BRANCH_CENSUS.md` | Historical evidence retained outside active documentation |
| `SAVE_FAILURE_FINDINGS.md` | T5 | ACTIVE | Move to `docs/audits/SAVE_FAILURE_FINDINGS.md` | Point-in-time audit or engineering evidence |
| `SPEAKER_REASSIGNMENT_FIX_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/reports/SPEAKER_REASSIGNMENT_FIX_REPORT.md` | Historical evidence retained outside active documentation |
| `STAGE_0_5_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/status/STAGE_0_5_REPORT.md` | Historical evidence retained outside active documentation |
| `STAGE_1_5_FUNCTION_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/STAGE_1_5_FUNCTION_AUDIT.md` | Point-in-time audit or engineering evidence |
| `STAGE_1_COMPLETION_REPORT.md` | T7 | ARCHIVED | Move to `docs/archive/status/STAGE_1_COMPLETION_REPORT.md` | Historical evidence retained outside active documentation |
| `STAGE_2_REPORTER_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/STAGE_2_REPORTER_AUDIT.md` | Point-in-time audit or engineering evidence |
| `STAGE_3_WITNESS_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/STAGE_3_WITNESS_AUDIT.md` | Point-in-time audit or engineering evidence |
| `STAGE_4_INTERPRETER_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/STAGE_4_INTERPRETER_AUDIT.md` | Point-in-time audit or engineering evidence |
| `STAGE_5_VIDEOGRAPHER_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/STAGE_5_VIDEOGRAPHER_AUDIT.md` | Point-in-time audit or engineering evidence |
| `STANDARDS_CONSISTENCY_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/STANDARDS_CONSISTENCY_AUDIT.md` | Point-in-time audit or engineering evidence |
| `TRANSCRIPT_KEYTERM_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/TRANSCRIPT_KEYTERM_AUDIT.md` | Point-in-time audit or engineering evidence |
| `TRANSCRIPT_PIPELINE_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/TRANSCRIPT_PIPELINE_AUDIT.md` | Point-in-time audit or engineering evidence |
| `TRANSCRIPT_QUALITY_FINDINGS.md` | T5 | ACTIVE | Move to `docs/audits/TRANSCRIPT_QUALITY_FINDINGS.md` | Point-in-time audit or engineering evidence |
| `UFM_FIELD_AUDIT.md` | T5 | ACTIVE | Move to `docs/audits/UFM_FIELD_AUDIT.md` | Point-in-time audit or engineering evidence |

## Local files outside classification

`.aider.chat.history.md` is ignored, untracked local tool history. It was not treated as
project documentation, moved, edited, or committed.

## Verification

- No tracked audit, report, plan, checklist, design, findings, or status Markdown remains at root.
- The six root exceptions are listed in the ratified Project Authority Index.
- Every moved destination exists.
- Local Markdown references were re-resolved after relocation.
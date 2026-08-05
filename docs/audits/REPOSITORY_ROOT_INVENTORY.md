# Repository Root Inventory

**Audit date:** 2026-08-03  
**Branch:** `perf/lazy-load-stage-screens`  
**HEAD:** `e1ad8d0460d38a1c37f42130333933350ce9def6`  
**Upstream:** `origin/feature/stage3-workspace-core`  
**Integration branch:** `feature/stage3-workspace-core` at `49d32c4eacfc6b2cf667b0d6a1050dacd90835b4`  
**Remote default:** `origin/main`  
**Scope:** 122 root entries: 28 directories and 94 files.

Git evidence uses `T@<commit>` for tracked items and `U` for untracked/ignored items. “Refs” describes the strongest observed dependency class. Recommendations are future actions only; this audit moved or deleted nothing.

## Directories

| Current path | Type / purpose | Git evidence | Active references | Recommendation | Proposed destination | Confidence | Reason |
|---|---|---|---|---|---|---|---|
| `.agents/` | Agent skills/instructions | T@`75f280c` | Tooling | KEEP | root | High | Repository-local agent behavior belongs at discovery root. |
| `.aider.tags.cache.v4/` | Aider cache DB | U | None | DELETE | — | High | Reproducible local cache; ignored by `.aider*`; recover by rerunning Aider indexing. |
| `.bolt/` | Bolt project configuration | T@`77613b0` | Tooling | KEEP | root | Medium | Tracked tool configuration; ownership should remain discoverable. |
| `.claude/` | Local Claude settings | U | Local tooling | DELETE | — | Medium | Untracked machine-local settings; recover through local tool configuration. Confirm no desired shared settings first. |
| `.git/` | Git metadata | U/system | Git | KEEP | root | High | Required repository metadata; never cleanup as project content. |
| `.github/` | CI workflow | T@`ca4cd77` | CI | KEEP | root | High | GitHub requires this location. |
| `.tmp/` | Temporary diagnostics/output, 19k+ files | U | None authoritative | DELETE | — | High | Ignored, generated scratch content; recover by rerunning diagnostics. Verify no unique evidence before removal. |
| `.vercel/` | Local Vercel link metadata | U | Deployment tooling | DELETE | — | Medium | Ignored and locally reproducible by relinking; ensure project linkage is recorded elsewhere first. |
| `ai_logs/` | Tracked remediation/audit reports | T@`499ff1c` | Scripts and documentation | MOVE | `docs/audits/remediation/` | High | Active scripts name this path; move requires coordinated script/link updates. |
| `Audit/` | Standalone extraction audit harness | U | Separate npm project; may ingest real legal documents/secrets | INVESTIGATE | Outside repo or approved `tools/audits/` | High | Sensitive-data-capable, untracked, unclear ownership; contain and review before any action. |
| `benchmark-corpus/` | Synthetic/private-path benchmark manifest | T@`e9d8b2e` | Benchmark runner | KEEP | root | High | Active data contract; manifest currently contains no client payloads. |
| `bolt_export/` | Exported Bolt ZIP | U | None | DELETE | — | High | Ignored reproducible export; recover from source/tool export. |
| `Canonical Standards Folder/` | Standards plus runtime abbreviation registry | T@`43246ef` | Runtime imports and audits | KEEP | root pending planned split | High | Runtime JSON is imported by source; moving requires code/config work. Historical documents can later be split from active standards. |
| `dist/` | Vite build output | U | Build output | DELETE | — | High | Ignored and recreated by `npm run build`. |
| `docs/` | Project documentation | T@`e7809db` | Governing/audit/operations docs | KEEP | root | High | Canonical documentation tree. |
| `formatter_core/` | Active export renderer | T@`15e9991` | Formatter service/tests | KEEP | root | High | Active Python service module. |
| `formatter_service/` | Active formatter worker | T@`a4960d1` | Cloud build/runbooks | KEEP | root | High | Deployable service source. |
| `node_modules/` | Installed JS dependencies | U | Local build | DELETE | — | High | Ignored and reproducible with `npm ci`. |
| `public/` | Vite static assets | T@`77613b0` | Build/runtime | KEEP | root | High | Standard Vite source directory. |
| `reference/` | Wave8 normative reference | T@`89d5e25` | AGENTS/docs | KEEP | root | High | Locked read-only normative reference. |
| `scripts/` | Project automation/verification | T@`e7809db` | package/docs/tooling | KEEP | root | High | Active repository tooling. |
| `src/` | Application source | T@`e1ad8d0` | Runtime/build | KEEP | root | High | Primary Vite/React source. |
| `supabase/` | Functions, migrations, config | T@`09a33a4` | Runtime/deployment | KEEP | root | High | Active backend infrastructure. |
| `test-results/` | Test/dev-server output | U | None | DELETE | — | High | Ignored reproducible test output; recover by rerunning tests. |
| `tools/` | Local Deepgram script and bytecode | U | No tracked references | INVESTIGATE | secure external tooling or `scripts/` after sanitization | High | Script contains machine-specific paths with apparent client/project identifiers; do not commit or casually delete. |
| `transcript_finalize_service/` | Cloud Run finalizer | T@`8457470` | Cloud build/runbooks | KEEP | root | High | Active deployable service. |
| `transcript_formatter/` | Python formatter/TIE/legacy characterization | T@`9c29a08` | AGENTS/runtime/tests | KEEP | root | High | Active and migration-critical; legacy code is explicitly protected. |
| `UsersjamesAppDataLocalTempdepo_pytest/` | Empty malformed temp-path directory | U | None | DELETE | — | High | Machine-specific empty artifact; no tracked references; recoverability irrelevant. |

## Root files

| Current path | Purpose | Git evidence | Refs | Recommendation | Proposed destination | Confidence | Reason |
|---|---|---|---|---|---|---|---|
| `.aider.chat.history.md` | Local AI chat history | U | None | DELETE | — | High | Ignored local history; may contain prompts/context; recover only from local tool history. |
| `.aider.input.history` | Local Aider input history | U | None | DELETE | — | High | Ignored local history; possible sensitive prompt material. |
| `.env` | Local secrets/runtime configuration | U | README/scripts | KEEP | root, untracked | High | Required documented local location; never commit or expose values. |
| `.env.example` | Safe environment template | T@`88624f0` | README/tooling | KEEP | root | High | Conventional authoritative environment template. |
| `.gcloudignore` | Cloud build exclusions | T@`8457470` | Cloud Build | KEEP | root | High | Deployment configuration expects root context. |
| `.gitattributes` | Git behavior | T@`8457470` | Git | KEEP | root | High | Repository configuration. |
| `.gitignore` | Ignore policy | T@`e7809db` | Git/tooling | KEEP | root | High | Repository configuration. |
| `AGENTS.md` | Locked agent rules | T@`9c29a08` | Agent discovery | KEEP | root | High | Governing root document. |
| `ARCHITECTURE_DECISIONS.md` | Active ADR registry | T@`bcb6c70` | Scripts, prompts, operating standard | KEEP | root | High | Explicitly linked and written by active remediation tooling. |
| `docs/archive/reports/ARRAY_FIELD_PERSIST_FIX_REPORT.md` | Completed intake fix report | T@`5dc3729` | Historical | ARCHIVE | `docs/archive/reports/` | High | Evidentiary but not current authority. |
| `docs/audits/ATOMICITY_AUDIT.md` | Conflict/provenance audit | T@`4755392` | Historical | MOVE | `docs/audits/` | High | Audit evidence fits existing audit convention. |
| `docs/archive/reports/ATTORNEY_KEYTERM_VERIFICATION.md` | Completed keyterm verification | T@`ff0090d` | Historical | ARCHIVE | `docs/archive/reports/` | High | Point-in-time verification. |
| `docs/audits/ATTORNEY_UFM_MAPPING_TABLE.md` | Field mapping reference | T@`37a4cf4` | Domain evidence | MOVE | `docs/standards/` | Medium | Potential active reference; preserve as standards/data documentation. |
| `docs/archive/reports/AUDIO_READINESS_FIX_REPORT.md` | Completed fix report | T@`75f280c` | Historical | ARCHIVE | `docs/archive/reports/` | High | Point-in-time implementation evidence. |
| `docs/audits/AUTH_RLS_AUDIT.md` | Security audit | T@`7539c36` | Historical/security | MOVE | `docs/audits/` | High | Audit evidence remains useful. |
| `docs/archive/reports/AUTH_RLS_REPORT.md` | RLS remediation/verification | T@`7b1f372` | Historical/security | ARCHIVE | `docs/archive/reports/` | Medium | Overlaps auth audit; retain verification history. |
| `docs/archive/reports/BACKEND_WIRING_REPORT.md` | Editor API wiring report | T@`ba5aed1` | Historical | ARCHIVE | `docs/archive/reports/` | High | Completed implementation evidence. |
| `benchmark.json` | Default benchmark configuration | T@`e7809db` | Runtime import + script default | KEEP | root | High | Active build/runtime dependency. |
| `docs/archive/status/BETA_FREEZE.md` | Old branch/freeze status | T@`cee2d3c` | Historical | ARCHIVE | `docs/archive/status/` | High | Time-bound status, not present policy. |
| `docs/archive/reports/BINDING_CONFIRM_REPORT.md` | Completed gate report | T@`b995f2a` | Historical | ARCHIVE | `docs/archive/reports/` | High | Point-in-time remediation evidence. |
| `CANONICAL_STANDARDS_INDEX.md` | Active standards index | T@`c426cfc` | Standards/audits | KEEP | root pending standards reorganization | High | Current authority index with many references. |
| `docs/archive/audits/CASE_STYLE_TERMINOLOGY_FINDINGS.md` | UI terminology findings | T@`97cf899` | Historical | ARCHIVE | `docs/archive/audits/` | High | Completed narrow audit. |
| `docs/audits/CERTIFICATION_EXPORT_END_TO_END_AUDIT.md` | Certification/export audit | T@`75f280c` | Historical | MOVE | `docs/audits/` | High | Audit evidence. |
| `docs/archive/reports/CERTIFICATION_EXPORT_REMEDIATION_REPORT.md` | Remediation report | T@`75f280c` | Historical | ARCHIVE | `docs/archive/reports/` | High | Follow-up implementation evidence. |
| `docs/audits/CERTIFICATION_LOCK_REMEDIATION.md` | Certification lock record | T@`cd19611` | Recent domain evidence | MOVE | `docs/audits/` | High | Security/integrity remediation evidence. |
| `docs/audits/CERTIFICATION_OWNER_AUDIT.md` | Ownership audit | T@`ca2cab2` | Recent audit | MOVE | `docs/audits/` | High | Fits active audit tree. |
| `docs/audits/CFE_PHASE0_FINDINGS.md` | CFE findings | T@`43246ef` | Standards history | MOVE | `docs/audits/` | High | Audit input; preserve links during move. |
| `cloudbuild.formatter.yaml` | Formatter Cloud Build config | T@`a559e49` | Deployment | KEEP | root | High | Build configuration relies on repository context. |
| `cloudbuild.transcript-finalize.yaml` | Finalizer Cloud Build config | T@`8457470` | Deployment | KEEP | root | Build configuration relies on repository context. |
| `docs/archive/reports/CONFIDENCE_PERSISTENCE_FIX_REPORT.md` | Completed fix report | T@`75f280c` | Historical | ARCHIVE | `docs/archive/reports/` | High | Point-in-time implementation evidence. |
| `CONTRACT_NOTES.md` | Frozen-contract deviations log | T@`902880b` | AGENTS/source/docs | KEEP | root | High | Locked instructions explicitly require this path. |
| `docs/audits/DATA_REALITY_FINDINGS.md` | Data ownership findings | T@`8a44268` | Domain audit | MOVE | `docs/audits/` | High | Active audit evidence. |
| `docs/operations/DEEPGRAM_GO_LIVE_CHECKLIST.md` | Operational launch checklist | T@`9e237b6` | Operations | MOVE | `docs/operations/` | High | Operational document, not root configuration. |
| `docs/archive/reports/DEEPGRAM_PIPELINE_REPORT.md` | Pipeline report | T@`e1e9731` | Historical | ARCHIVE | `docs/archive/reports/` | Medium | Later pipeline audits under `docs/audits` supersede much of it. |
| `docs/archive/reports/DEEPGRAM_WIRE_PARAMS_REPORT.md` | Wire-parameter report | T@`59a873e` | Historical | ARCHIVE | `docs/archive/reports/` | High | Completed implementation evidence. |
| `docs/audits/DEPO_EDITOR_BACKEND_AUDIT.md` | Backend audit | T@`8429795` | Historical | MOVE | `docs/audits/` | High | Audit evidence. |
| `docs/archive/handoffs/DEPO_PRO_SESSION_HANDOFF_2026-06-24.md` | Session handoff | T@`4f570ce` | Historical | ARCHIVE | `docs/archive/handoffs/` | High | Date-bound handoff. |
| `docs/archive/reports/DURABLE_MOCK_PERSISTENCE_REPORT.md` | Completed fix report | T@`75f280c` | Historical | ARCHIVE | `docs/archive/reports/` | High | Point-in-time implementation evidence. |
| `docs/archive/reports/EDITOR_BASE_URL_FIX_REPORT.md` | Completed fix report | T@`9e237b6` | Historical | ARCHIVE | `docs/archive/reports/` | High | Point-in-time implementation evidence. |
| `docs/audits/EDITOR_LOAD_FAILURE_AUDIT.md` | Failure audit | T@`9e237b6` | Historical | MOVE | `docs/audits/` | High | Diagnostic evidence. |
| `docs/audits/ERROR_COVERAGE_MATRIX.md` | Error coverage audit | T@`1265bb2` | Quality evidence | MOVE | `docs/audits/` | High | Active audit format. |
| `eslint.config.js` | ESLint config | T@`a7424dd` | Build/CI | KEEP | root | High | Standard toolchain file. |
| `docs/audits/EXPORT_ADAPTER_OWNER_AUDIT.md` | Export ownership audit | T@`ef353d6` | Recent audit | MOVE | `docs/audits/` | High | Architecture ownership evidence. |
| `docs/archive/reports/FIND_WORD_AT_TIME_FIX_REPORT.md` | Completed fix report | T@`75f280c` | Historical | ARCHIVE | `docs/archive/reports/` | High | Point-in-time implementation evidence. |
| `docs/audits/FORMATTER_OWNER_AUDIT.md` | Formatter ownership audit | T@`a4960d1` | Recent audit | MOVE | `docs/audits/` | High | Architecture ownership evidence. |
| `docs/archive/reports/GATE1_REMEDIATION_REPORT.md` | Completed remediation | T@`75f280c` | Historical | ARCHIVE | `docs/archive/reports/` | High | Point-in-time evidence. |
| `docs/reconciliation/GEOMETRY_AUTHORITY_RECONCILIATION.md` | Standards reconciliation | T@`2c7ccbc` | Standards references | MOVE | `docs/reconciliation/` | High | Supporting rationale; DP-011 remains authority. |
| `docs/operations/GITHUB_CLEANUP_PLAN.md` | Privacy/cleanup plan | T@`1ace495` | Operational/history | MOVE | `docs/operations/` | Medium | May contain unresolved repository hygiene actions. |
| `index.html` | Vite HTML entry | T@`e402534` | Build/runtime | KEEP | root | High | Vite expects root entry. |
| `docs/audits/INTAKE_END_TO_END_VALIDATION_AUDIT.md` | Intake validation audit | T@`4748109` | Historical | MOVE | `docs/audits/` | High | Audit evidence. |
| `docs/audits/INTAKE_LIFECYCLE_INTEGRITY_AUDIT.md` | Intake integrity audit | T@`bef2764` | Historical | MOVE | `docs/audits/` | High | Audit evidence. |
| `docs/archive/reports/INTAKE_REAL_REPORT.md` | Real-mode verification report | T@`3e3fa80` | Historical | ARCHIVE | `docs/archive/reports/` | High | Point-in-time verification. |
| `docs/audits/INTAKE_REAL_VS_MOCK_AUDIT.md` | Intake mode audit | T@`65dec99` | Historical | MOVE | `docs/audits/` | High | Audit evidence. |
| `docs/audits/INTAKE_SCREEN_AUDIT.md` | Screen audit | T@`65dec99` | Historical | MOVE | `docs/audits/` | High | Audit evidence. |
| `docs/archive/reports/INTAKE_SCREEN_OWNERSHIP_REPORT.md` | Ownership report | T@`65dec99` | Historical | ARCHIVE | `docs/archive/reports/` | Medium | Overlaps screen audit; preserve supporting evidence. |
| `docs/audits/INTAKE_UFM_GAP_ANALYSIS.md` | Gap analysis | T@`65dec99` | Historical/domain | MOVE | `docs/audits/` | High | Audit/gap evidence. |
| `docs/audits/INTAKE_UI_AUDIT.md` | UI audit | T@`bb85a46` | Historical | MOVE | `docs/audits/` | High | Audit evidence. |
| `docs/archive/reports/INTAKE_UI_FIXES_REPORT.md` | Completed fixes | T@`a2bcf3f` | Historical | ARCHIVE | `docs/archive/reports/` | High | Implementation evidence. |
| `docs/archive/reports/KEYTERM_EXPANSION_NOTES.md` | Keyterm implementation notes | T@`ff0090d` | Historical | ARCHIVE | `docs/archive/reports/` | High | Completed change notes. |
| `docs/audits/KEYTERM_PIPELINE_FINDINGS.md` | Pipeline findings | T@`1265bb2` | Audit | MOVE | `docs/audits/` | High | Audit evidence. |
| `docs/audits/MIGRATION_AUDIT.md` | Supabase migration audit | T@`75f280c` | Database audit | MOVE | `docs/audits/` | High | Audit evidence; migrations remain untouched. |
| `docs/archive/reports/MOUNT_CONTRACT_MIGRATION_REPORT.md` | Completed migration report | T@`75f280c` | Historical | ARCHIVE | `docs/archive/reports/` | High | Implementation evidence. |
| `docs/archive/reports/MULTIFILE_BUILD_REPORT.md` | Multi-file implementation report | T@`38f832b` | Historical | ARCHIVE | `docs/archive/reports/` | High | Design is separately retained. |
| `docs/architecture/MULTIFILE_TRANSCRIPTION_DESIGN.md` | Multi-file architecture/design | T@`33ee5d1` | Domain architecture | MOVE | `docs/architecture/` | High | Design belongs with architecture. |
| `NUMBERING_REGISTRY.md` | Active standards numbering registry | T@`9995bcb` | Standards/scripts | KEEP | root pending standards reorganization | High | Explicit canonical copy; duplicate pointer exists elsewhere. |
| `package-lock.json` | npm lockfile | T@`565efef` | Build/CI | KEEP | root | High | Required reproducible installs. |
| `package.json` | JS manifest/scripts | T@`e7809db` | Build/runtime | KEEP | root | High | Required project manifest. |
| `docs/audits/PARTICIPANT_IMPLEMENTATION_AUDIT.md` | Participant audit | T@`738b60b` | Historical | MOVE | `docs/audits/` | High | Audit evidence. |
| `docs/audits/PARTICIPANT_MODAL_AUDIT.md` | Modal audit | T@`672059d` | Historical | MOVE | `docs/audits/` | High | Audit evidence. |
| `postcss.config.js` | PostCSS config | T@`77613b0` | Build | KEEP | root | High | Standard toolchain file. |
| `docs/archive/status/PRE_RC_CHECKLIST.md` | Old pre-RC checklist | T@`b650db6` | Historical | ARCHIVE | `docs/archive/status/` | High | Time-bound release status; newer operations/runbooks exist. |
| `docs/archive/reports/PROVIDER_MIGRATION_REPORT.md` | Provider migration report | T@`9ab972e` | Historical | ARCHIVE | `docs/archive/reports/` | High | Completed legacy migration evidence. |
| `docs/audits/RC_HARDENING_OWNER_AUDIT.md` | RC ownership audit | T@`a7424dd` | Recent audit | MOVE | `docs/audits/` | High | Audit evidence. |
| `README.md` | Project entry documentation | T@`88624f0` | Universal | KEEP | root | High | Conventional project entry point. |
| `docs/audits/SAVE_FAILURE_FINDINGS.md` | Save-path findings | T@`1265bb2` | Audit | MOVE | `docs/audits/` | High | Diagnostic evidence. |
| `skills-lock.json` | Agent skills lock | T@`75f280c` | Agent tooling | KEEP | root | High | Root-discovered tool lock. |
| `docs/archive/reports/SPEAKER_REASSIGNMENT_FIX_REPORT.md` | Completed fix report | T@`75f280c` | Historical | ARCHIVE | `docs/archive/reports/` | High | Point-in-time implementation evidence. |
| `docs/archive/status/STAGE_0_5_REPORT.md` | Stage gate report | T@`2fd2929` | Historical | ARCHIVE | `docs/archive/status/` | High | Time-bound stage decision. |
| `docs/audits/STAGE_1_5_FUNCTION_AUDIT.md` | Attorney function audit | T@`343f139` | Historical | MOVE | `docs/audits/` | High | Audit evidence. |
| `docs/archive/status/STAGE_1_COMPLETION_REPORT.md` | Stage completion report | T@`d041501` | Historical | ARCHIVE | `docs/archive/status/` | High | Time-bound completion evidence. |
| `docs/audits/STAGE_2_REPORTER_AUDIT.md` | Reporter wiring audit | T@`c65ba81` | Historical | MOVE | `docs/audits/` | High | Audit evidence. |
| `docs/audits/STAGE_3_WITNESS_AUDIT.md` | Witness audit | T@`d078352` | Historical | MOVE | `docs/audits/` | High | Audit evidence. |
| `docs/audits/STAGE_4_INTERPRETER_AUDIT.md` | Interpreter audit | T@`50029cc` | Historical | MOVE | `docs/audits/` | High | Audit evidence. |
| `docs/audits/STAGE_5_VIDEOGRAPHER_AUDIT.md` | Videographer audit | T@`68c6c2a` | Historical | MOVE | `docs/audits/` | High | Audit evidence. |
| `docs/audits/STANDARDS_CONSISTENCY_AUDIT.md` | Standards corpus audit | T@`1265bb2` | Standards/audits | MOVE | `docs/audits/` | High | Active audit evidence; preserve authority links. |
| `tailwind.config.js` | Tailwind config | T@`77613b0` | Build | KEEP | root | High | Standard toolchain file. |
| `docs/audits/TRANSCRIPT_KEYTERM_AUDIT.md` | Transcript/keyterm audit | T@`1e5384f` | Historical | MOVE | `docs/audits/` | High | Audit evidence. |
| `docs/audits/TRANSCRIPT_QUALITY_FINDINGS.md` | Transcript quality findings | T@`43246ef` | Audit | MOVE | `docs/audits/` | High | Audit evidence and potential open work. |
| `tsconfig.app.json` | App TypeScript config | T@`088c489` | Build/CI | KEEP | root | High | Toolchain configuration. |
| `tsconfig.json` | Root TypeScript config | T@`77613b0` | Build/IDE | KEEP | root | Toolchain configuration. |
| `tsconfig.node.json` | Node TypeScript config | T@`77613b0` | Build | KEEP | root | Toolchain configuration. |
| `docs/audits/UFM_FIELD_AUDIT.md` | UFM audit | T@`37092aa` | Historical | MOVE | `docs/audits/` | High | Audit evidence. |
| `vite.config.ts` | Vite config | T@`e1ad8d0` | Build | KEEP | root | Toolchain configuration. |
| `vitest.config.ts` | Vitest config | T@`3d539de` | Test/CI | KEEP | root | Toolchain configuration. |

## Counts by recommendation

| Recommendation | Count |
|---|---:|
| KEEP | 42 |
| MOVE | 39 |
| ARCHIVE | 28 |
| DELETE | 11 |
| INVESTIGATE | 2 |
| **Total** | **122** |

All 11 DELETE candidates are untracked/ignored local or generated artifacts. No tracked item is recommended for deletion in this audit.

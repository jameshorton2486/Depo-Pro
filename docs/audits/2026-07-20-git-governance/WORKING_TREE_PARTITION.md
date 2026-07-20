# Working Tree Partition

**Phase:** 2 — partition only. No file has been staged, committed, moved, deleted, or pushed.

## Proposed groups

| Group | Proposed purpose | Snapshot membership | State |
|---|---|---|---|
| G1 — Repository Governance | Stabilization evidence and operating standards | `docs/audits/2026-07-20-git-governance/**`, `docs/architecture/PROJECT_OPERATING_STANDARD.md`, `.gitignore`, `package.json`, `scripts/**` | Hold for review; do not mix with product behavior. |
| G2 — Documentation | Roadmaps, architecture maps, audits, release/checklist material, standards, sprint reports | All remaining changed/untracked `*.md`, `Canonical Standards Folder/**`, and non-generated `docs/**` | Hold for review; future docs-only commits may be split by audience. |
| G3 — Wave 23B Canonical Integrity | Canonical transcript validation | `src/lib/transcript/canonicalIntegrity.ts`, `src/lib/transcript/canonicalIntegrity.test.ts` | Ready for focused behavioral review. |
| G4 — Wave 23C Proceedings Boundaries | Boundary punctuation and duplicate procedural-event behavior | `src/lib/transcript/boundaryEngine.ts`, `src/lib/transcript/boundaryEngine.test.ts` | Ready for focused behavioral review. |
| G5 — Migration History | Atomic-ingest/watchdog/original-snapshot and storage-policy migration history | Every changed/untracked `supabase/migrations/**` path, including deleted prior names | Hold. Requires remote-history/deployment reconciliation before any commit. |
| G6 — Edge Functions | Transcription and editor server behavior | `supabase/functions/**` | Hold. Must be partitioned with only the corresponding client/pipeline files after migration review. |
| G7 — Intake, Formatting, and UI | Field formatting, extracted fields, intake/participant UI, toolbar, editor presentation | Remaining changed `src/api/**`, `src/components/**`, `src/context/**`, `src/store/**`, `src/index.css`, `src/types/**` | Hold. Multiple user-visible features are interleaved. |
| G8 — Transcript Pipeline Architecture | Non-23B/23C transcript, Deepgram, keyterm, UFM, format, and editor internals | Remaining changed `src/lib/**` and `src/editor/**` paths | Hold. Requires single-owner/wiring review before commit assembly. |
| G9 — Validation Attachments | Tests not explicitly owned by G3/G4 | Every remaining changed/untracked `*.test.ts` and `*.test.tsx` | Attach to its owning group during approved commit assembly; never commit as a mixed test bundle. |
| G10 — Generated Artifacts | Build/dashboard output not yet established as source | `vite.config.ts.timestamp-1784417693802-fc4563c0a097c.mjs` and generated dashboard JSON | Hold. Verify provenance before adding, ignoring, or removing. |

## Partition rules

1. Group membership is deterministic by the ordered rules in `WORKING_TREE_CLASSIFICATION.md`.
2. G3 and G4 are the only currently narrow enough groups to be proposed as future focused commits without further separation.
3. G5, G6, G7, G8, and G10 are intentionally **hold** groups. This is a safety result, not incomplete cleanup: their present contents are too interleaved to make a responsible commit proposal.
4. G9 tests must travel with the implementation group that owns the behavior they verify.
5. No group authorizes staging. Phase 3 requires a separate approval after review of this partition and the split-commit proposals.

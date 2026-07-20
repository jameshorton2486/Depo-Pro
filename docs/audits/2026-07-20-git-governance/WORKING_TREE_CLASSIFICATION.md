# Working Tree Classification

**Scope:** all modified, deleted, and untracked primary-worktree paths observed at Phase 1. This is a deterministic ownership map, not a staging plan.

## Classification precedence

Each path belongs to the first matching group below; therefore no path can belong to more than one group.

| Order | Group | Exact membership rule |
|---:|---|---|
| 1 | Repository Governance | `.gitignore`, `package.json`, `scripts/**`, and `docs/audits/2026-07-20-git-governance/**`, and `docs/architecture/PROJECT_OPERATING_STANDARD.md`. |
| 2 | Generated Artifacts | `vite.config.ts.timestamp-*.mjs` and generated dashboard JSON under `docs/dashboard/**`. |
| 3 | Documentation | All remaining `*.md`, `docs/**`, `Canonical Standards Folder/**`, and root sprint/report files. |
| 4 | Migrations | `supabase/migrations/**`. |
| 5 | Edge Functions | `supabase/functions/**`. |
| 6 | Wave 23B | `src/lib/transcript/canonicalIntegrity.ts` and `canonicalIntegrity.test.ts`. |
| 7 | Wave 23C | `src/lib/transcript/boundaryEngine.ts` and `boundaryEngine.test.ts`. |
| 8 | Tests | All remaining `*.test.ts` and `*.test.tsx`. |
| 9 | Transcript Architecture | Remaining `src/lib/transcript/**`, `src/editor/**`, `src/lib/deepgram/**`, `src/lib/keyterms/**`, `src/lib/ufm/**`, and `src/lib/format/**`. |
| 10 | Intake and Application UI | Every remaining `src/**` path, including API, components, contexts, stores, CSS, and types. |

## Findings

- The apparent primary-worktree summary understates the broader repository context: historical formatter and standards material exists in recovery references and must not be treated as disposable noise.
- Deleted prior migration filenames and newly added replacement migration filenames belong together only as a future migration-history review; no deletion is authorized.
- The generated Vite timestamp module is the sole immediately suspect generated artifact. Its source/provenance must be verified before any ignore/removal proposal.
- This map is intentionally not a Phase 2 commit partition. Tests remain classified separately here and will be attached to their behavior group only after approval.

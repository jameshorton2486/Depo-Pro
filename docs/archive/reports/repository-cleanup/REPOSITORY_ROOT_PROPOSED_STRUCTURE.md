---
authority_tier: T7
original_authority_tier: T6
status: ARCHIVED
owner: Architecture
scope: repository-root-proposed-structure
supersedes: null
superseded_by: docs/audits/ROOT_DOCUMENT_DISPOSITION_2026-08-05.md
approved_by: null
version: null
effective_date: null
ratified_date: null
last_reviewed: 2026-08-05
next_review: null
ratification: NOT_REQUIRED
implementation_status: NOT_APPLICABLE
archive_category: reports
---

# Proposed Repository Root Structure

## Target

```text
Depo-Pro/
├── .agents/
├── .bolt/
├── .github/
├── .git/
├── .env                    # local and ignored
├── .env.example
├── .gcloudignore
├── .gitattributes
├── .gitignore
├── AGENTS.md
├── ARCHITECTURE_DECISIONS.md
├── CANONICAL_STANDARDS_INDEX.md
├── CONTRACT_NOTES.md
├── NUMBERING_REGISTRY.md
├── README.md
├── benchmark-corpus/
├── benchmark.json
├── Canonical Standards Folder/  # temporary mixed runtime/authority location
├── cloudbuild.formatter.yaml
├── cloudbuild.transcript-finalize.yaml
├── docs/
│   ├── architecture/
│   ├── archive/
│   │   ├── audits/
│   │   ├── handoffs/
│   │   ├── reports/
│   │   ├── standards/
│   │   └── status/
│   ├── atia/
│   ├── audits/
│   ├── benchmark/
│   ├── operations/
│   ├── reconciliation/
│   └── standards/
├── formatter_core/
├── formatter_service/
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── public/
├── reference/
├── scripts/
├── skills-lock.json
├── src/
├── supabase/
├── tailwind.config.js
├── transcript_finalize_service/
├── transcript_formatter/
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── vitest.config.ts
```

## Why these remain at root

- GitHub, Git, agent, and Bolt directories use root discovery conventions.
- Vite/npm/TypeScript/Tailwind/PostCSS/ESLint/Vitest manifests and configs are standard root toolchain inputs.
- Cloud Build files use repository-root build contexts.
- Application, backend, service, public, script, benchmark, and normative-reference directories are primary project modules.
- `.env` is the documented single local secret file and must remain ignored.
- `AGENTS.md` and `README.md` are discovery authorities.
- `CONTRACT_NOTES.md` has a locked path in AGENTS.md and source documentation.
- The ADR and standards registries have active exact-path references; retain them until a dedicated authority migration updates every reference atomically.

## Documentation relocation map

| Content class | Destination | Examples |
|---|---|---|
| Current evidence-backed audits | `docs/audits/` | ownership, integrity, security, pipeline, gap analyses |
| Governing designs | `docs/architecture/` | multi-file transcription design |
| Operational checklists/plans | `docs/operations/` | Deepgram go-live, repository cleanup plan |
| Reconciliation rationale | `docs/reconciliation/` | geometry authority reconciliation |
| Active field/mapping standards | `docs/standards/` | attorney/UFM mapping table after ownership confirmation |
| Completed implementation reports | `docs/archive/reports/` | fix/remediation/build reports |
| Date-bound handoffs | `docs/archive/handoffs/` | session handoff documents |
| Old stage/release state | `docs/archive/status/` | beta freeze, pre-RC, completion reports |
| Superseded audit evidence | `docs/archive/audits/` | narrow findings superseded by current audits |
| AI remediation history | `docs/audits/remediation/` | current `ai_logs` corpus and hash chain |

## Deferred standards split

`Canonical Standards Folder` mixes live runtime data, active standards, changelogs, prompts, legacy specifications, and an authoring artifact. A later scoped migration should:

1. place the runtime JSON registry in a stable source/data location;
2. move active DP standards and editorial policy under `docs/standards`;
3. archive changelogs, superseded standards, prompts, and legacy formatter specifications;
4. update TypeScript imports, indexes, tests, links, and authority banners atomically;
5. preserve `reference/wave8` unchanged.

Until that migration is approved and tested, the entire folder remains at root.

## Items intentionally absent from the target

Generated/cache/local artifacts are not part of the intended repository structure: `.aider*`, `.claude`, `.tmp`, `.vercel`, `bolt_export`, `dist`, `node_modules`, `test-results`, and the malformed pytest temp directory. `Audit/` and `tools/` are omitted pending human investigation; they must not be silently folded into tracked source because of sensitive-data and ownership concerns.

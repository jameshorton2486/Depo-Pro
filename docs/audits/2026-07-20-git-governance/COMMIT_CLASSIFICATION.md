# Commit Classification

**Scope:** all locally unpushed commits at Checkpoint 1. Classification only; no commits were changed.

| SHA | Subject | Category | Disposition | Rationale |
|---|---|---|---|---|
| `bb4743c` | canonical text from words | Bug Fix | Keep | Focused normalization correction. |
| `3c4eae0` | idempotent editor rendering | Bug Fix | Keep | Focused remount-loop correction. |
| `28d2890` | canonical intake integrity | Architecture | Split | Contains pipeline behavior/tests and audit prompts. |
| `9c3950f` | precompute speaker/structure metadata | Architecture | Keep | Coherent metadata ownership change. |
| `820da37` | forced-login redirect loop | Bug Fix | Keep | Single runtime correction. |
| `515fd1b` | working-text overflow guard | Bug Fix | Keep | Coherent persistence correction. |
| `85c7c13` | Deepgram auto-seed tracking | Bug Fix | Keep | Single component correction. |
| `d6f9548` | no-exhibit Stage 4 completion | Feature | Keep | Focused workflow capability. |
| `10e2a77` | Wave 22 runbook/prompts | Documentation | Keep | Documentation-only commit. |
| `a161a4e` | inclusion-page formatter | Feature | Keep | Focused workspace feature. |
| `462c1e8` | self-merge | Release Engineering | Keep | Historical merge; preserve rather than rewrite. |
| `9a49f4a` | transcript contract region/caption | Feature | Keep | Coherent production-stage feature. |
| `6b6a6c8` | Deepgram/two-copy foundations | Infrastructure | Split | Documentation, UI, shared Edge infrastructure, and migrations need reviewable boundaries. |
| `2f55e06` | callback atomic ingest | Infrastructure | Keep | One Edge-function ingest behavior. |
| `24ba644` | Original viewer/retry wiring | Feature | Split | UI/viewer work is coupled with Edge/format import fixes. |
| `9afb41c` | Supabase setup guide | Documentation | Keep | Documentation-only. |
| `d89aae1` | correction/replay prompts | Documentation | Archive | Main-only historical prompt set; preserve until main reconciliation. |
| `25657da` | reuse case/workspace guard | Feature | Archive | Main-only behavior; evaluate during main reconciliation. |
| `7cd1f29` | display formatting normalization | Feature | Archive | Main-only behavior; evaluate during main reconciliation. |
| `73db99d` | refine overwrite/undo guard | Bug Fix | Archive | Main-only behavior; evaluate during main reconciliation. |
| `3a8ec34` | corrections-layer deferral | Documentation | Archive | Main-only decision record, preserved by branch/archive ref. |

## Summary

- **Keep:** 13
- **Split:** 3
- **Archive:** 5
- **Superseded:** 0
- **Obsolete:** 0

“Archive” means preserve and defer from the active line; it does not authorize deletion.

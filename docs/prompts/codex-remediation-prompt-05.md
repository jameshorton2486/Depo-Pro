# PROMPT 5 — Reconcile Anthropic model IDs and make the healthcheck test the real model

**Context.** Different model IDs are hardcoded across `supabase/functions/**`, and the healthcheck validates a different model string than production uses. A green healthcheck therefore does not prove the production model is reachable.

**Task.**
1. Introduce a single source of truth such as `supabase/functions/_shared/models.ts` exporting `PRIMARY_MODEL`, `EXTRACTION_MODEL`, and `HEALTHCHECK_MODEL`, where `HEALTHCHECK_MODEL` defaults to `PRIMARY_MODEL`.
2. Replace all inline model literals in `supabase/functions/**` with imports from that shared module.
3. Verify the configured model IDs against the live API with a minimal request. If a string is invalid, replace it with the correct current model ID and document the change in `ARCHITECTURE_DECISIONS.md`.
4. If extraction intentionally uses a cheaper model, document that exception explicitly.

**Acceptance / verification.**
1. Confirm no inline `claude-` literals remain outside the shared model file.
2. Paste live verification output showing the primary model returns HTTP 200.
3. Run `npm run typecheck` and report the commit hash.

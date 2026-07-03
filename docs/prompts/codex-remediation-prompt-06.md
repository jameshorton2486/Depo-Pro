# PROMPT 6 — Stop `extract-nod` from returning HTTP 200 on errors

**Context.** `supabase/functions/extract-nod/index.ts` returns status 200 on every failure path, which hides errors from clients and monitoring.

**Task.**
1. Return correct status codes: `405` for bad method, `400` for invalid input, `500` for missing server config or unexpected exceptions, and `502` for exhausted schema-mismatch retries after the Anthropic call.
2. Update the caller path in `src/api/client.ts` and any consumers so they branch on HTTP status rather than sniffing the response body.
3. Preserve the existing retry behavior before returning `502`.

**Acceptance / verification.**
1. Verify happy path `200`, empty-text `400`, and forced schema-fail `502`.
2. Run `npm run typecheck`, `npm test`, and report the commit hash.

# Security review — freeze-safe pass (secret exposure, edge auth)

---
authority_tier: T5
status: ACTIVE
owner: Architecture
scope: security-review-freeze-safe
supersedes: null
superseded_by: null
approved_by: null
version: null
effective_date: 2026-08-10
ratified_date: null
last_reviewed: 2026-08-10
next_review: 2027-08-10
ratification: NOT_REQUIRED
implementation_status: NOT_APPLICABLE
---

Date: 2026-08-10 · Read-only security review (Section 74). No secret values printed, no credentials rotated, no auth/RLS weakened. Scope: secret exposure, hardcoded credentials, frontend privilege leakage, secret logging, provider-key location, Edge Function auth/RLS posture, tracked env files. Material production security changes remain Human Gates.

## Result — clean on the high-signal items

| Check | Result | Evidence |
|---|---|---|
| Hardcoded API keys / JWTs / bearer tokens in `src/`+`supabase/` | **none** | regex scan for `sk-…`, `AIza…`, `eyJ….` → 0 |
| Service-role key referenced in **frontend** `src/` | **none** | `SERVICE_ROLE`/`serviceRole` in `src/` → 0 (server-only, correct) |
| Secrets exposed via `VITE_` (frontend-bundled) env | **none** | no `VITE_*SERVICE/SECRET/ROLE/PRIVATE*` |
| Secret **values** logged (`console.*` of key/token/authorization) | **none found** | scan → 0 |
| Tracked `.env` / committed secrets | **none** | `git ls-files` → no `.env`/secrets (only `.example`/`.d.ts`) |
| Production Deepgram key location | **server-side** | `transcribe-start` uses `Deno.env.get("DEEPGRAM_API_KEY")` (not `VITE_`) |

## Edge Function auth / RLS posture (sound)

- **User-facing functions consume the anon key + caller `Authorization` (JWT) → RLS-scoped:** `editor-api`, `export-adapter`, `transcribe-start` (each requires `Authorization`, returns 401 without it; owner scoping via RLS, e.g. editor-api `requireUnlockedTranscript`/case-scoped queries). `editor-api` has one service-role reference for a specific privileged path; primary access is anon+RLS.
- **Privileged/operator functions gate on the service-role bearer:** `recover-transcript` rejects unless `Authorization === "Bearer <service-role>"` (`index.ts:44`) — only a caller holding the service-role key can trigger recovery.
- **`ai-review`** runs with the service-role key and is invoked **server-to-server** (fire-and-forget from `editor-api`). Its in-code caller auth is light (relies on the platform `verify_jwt` gate, not visible in source).

## Notes (hygiene / deeper-review items — not active vulnerabilities)

1. **`VITE_DEEPGRAM_API_KEY` presence-gate.** Only its *presence* is read, as a fallback for offline-fixture mode (`DeepgramPayloadPreview.tsx:71`, alongside `VITE_TRANSCRIPTION_PROVIDER === "offline"`); the value is never sent. But because Vite inlines every `VITE_*` var, **if a developer populated it with a real key, that value would be bundled into the client JS.** Recommend gating offline mode **solely** on `VITE_TRANSCRIPTION_PROVIDER` so no real Deepgram key is ever a `VITE_` var. (Behavioral change to the gate → do at line_type/UI activation, not under freeze.)
2. **`src/benchmark/DeepgramBenchmark.ts`** calls `api.deepgram.com` directly with `Authorization: Token <credential>` — a **dev/benchmark harness** (passes a credential in), not the production transcription path. Confirm it is excluded from the production bundle / gated to dev.
3. **`ai-review` service-role caller auth** — confirm the deployed function's `verify_jwt`/invocation policy prevents direct calls by untrusted clients (a Supabase config check, outside the repo). Deeper-review item for the production-readiness gate.

## Scope not covered here (future production-readiness security gate)
Full RLS-policy review against the schema, Cloud Run service authentication, secret-rotation posture, and dependency CVE audit remain for the pre-production security gate (Human-Gate-adjacent; several need deployed-environment access). This pass covers the repository-visible, freeze-safe surface.

## Notes
Nothing changed; read-only. Relates to [[edge-function-verification-gap]] (auth/RLS in the same edge functions), [[pre-beta-edge-gaps]]. No new secrets introduced; `PERSISTED_LINE_TYPE_ENABLED` false; no deploy.

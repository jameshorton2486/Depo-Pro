# Backend Wiring Report

## Phase 0

### Sources of truth

Precedence used for ambiguities:
1. existing runtime schema
2. MSW observable behavior
3. inference from current non-mock runtime code

### Additive migration log

None yet.

### Ambiguities logged

1. `POST /suggestions/:id/resolve`
   - MSW updates suggestion state only
   - prompt requires accept/edit to also mutate document text
   - implementation will follow prompt and log the behavioral delta unless a later audit reveals a stricter in-app dependency

2. `GET /:jobId/certify/status`
   - MSW returns static fixture booleans
   - prompt requires computed checklist
   - implementation will use the existing real-runtime checklist semantics already present in `workspaceService.ts`

3. Runtime schema vs generated DB types
   - generated `src/types/database.ts` is stale for transcript tables
   - edge implementation will use local row types rather than changing frozen contract types

### Deferred

- Auth owner-scoping / RLS tightening remains deferred to the separate security task.

## Phase 1

### Decisions

- Route key uses `transcripts.transcript_id` exactly as requested by the prompt.
- The function creates the Supabase client per request with caller JWT passthrough from `Authorization`.
- Route matching is strict on method + path; unknown combinations return `404`.

### Additive migration log

None yet.

### Deferred

- All route bodies remain to be implemented in later phases.

## Phase 2

### Decisions

- `GET /document` returns `job_id = transcripts.job_id` while looking up the route by `transcript_id`.
- Word pagination is implemented in 1,000-row pages to avoid PostgREST row caps.
- `Word.text` is surfaced as `working_text ?? text` and `edited` is derived against `raw_text` at response time.
- Missing audio is non-fatal: the endpoint returns `media_url: ""` and logs a warning.

### Additive migration log

None yet.

## Phase 3

### Decisions

- Added `editor_apply_working_changes(...)` as a `security invoker` RPC to keep word updates, utterance text updates, and append-only audit inserts in one DB-side unit.
- Stored both `text` and `working_text` on update even though the prompt’s minimal wording mentions `text` only.
  - Reason: current runtime schema and loader semantics already use `working_text`, and leaving it stale would make `GET /document` return old text for previously edited rows.
- Wrote one audit row per changed utterance with action `bulk_save`, matching the existing audit action vocabulary.

### Additive migration log

- `20260606113000_editor_api_working_rpc.sql`
  - adds `public.editor_apply_working_changes(...)`
  - justification: atomic save helper for stable word-ID transcript edits plus append-only audit rows

## Phase 4

### Decisions

- `PUT /review` updates both `transcript_words.reviewed` and `transcript_review_state`.
- `review_complete` and `review_pct` are computed from live word rows during review writes.
- `PUT /speakers` updates speaker label columns (`display_name`, `assigned_name`, `speaker_label`) together to stay aligned with current runtime loading behavior.
- Speaker roles are normalized to lowercase DB text while the contract remains uppercase.
- `speaker_map_confirmed` is updated on `transcripts` during speaker saves because the current runtime already depends on it.

### Additive migration log

None.

## Phase 5

### Decisions

- Added `editor_resolve_suggestion(...)` as a `security invoker` RPC so suggestion status updates and document mutations happen atomically.
- `GET /suggestions` returns all suggestion rows, including already resolved ones.
- DB status `edited` is normalized back to contract status `accepted` because the frozen contract does not admit `edited`.
- Accept/edit mutate the target word text and append an `edit_word` audit row with `suggestion_id`.

### Additive migration log

- `20260606114500_editor_api_resolve_suggestion_rpc.sql`
  - adds `public.editor_resolve_suggestion(...)`
  - justification: atomic suggestion status update plus optional target-word mutation and audit append

## Phase 6

### Decisions

- `GET /exhibits` signs Storage-backed exhibit assets exactly like audio signing in `GET /document`.
- `review_complete` is computed as zero unreviewed transcript words remaining.
- `speaker_mapping_complete` is computed from live speaker rows having both non-empty display name and normalized role.
- `confidence_review_complete` is computed as zero unreviewed words below the editor threshold `0.70`, taken from `src/extensions/ConfidencePlugin.ts`.

### Additive migration log

None.

## Phase 7

### Decisions

- Client bearer-token attachment is implemented only in `src/api/client.ts`, preserving the single-network-module rule.
- Real backend mode is opt-in via `VITE_USE_REAL_API=1`; MSW remains the default in DEV.
- Stack-forced delta: `src/api/workspaceService.ts` also needed a minimal flag-gated branch to actually call the frozen REST client in real mode.
  - Reason: current repo reality already had a direct-Supabase non-mock path, so changing only `client.ts` and `main.tsx` would leave the new Edge Function unused by the app.
- Additional stack-forced delta: workspace entry points currently pass a case ID on initial Stage 3 load, while later panel actions use `document.job_id`.
  - Resolution: `workspaceService` now resolves case ID, transcript ID, or legacy job ID to a single transcript row before routing requests.
  - `EditorDocument.job_id` is normalized to `transcripts.transcript_id` so subsequent route calls stay on the same business key the Edge Function expects.

### Additive migration log

None.

## Phase 8

### Decisions

- Added local-only fixture-backed verification scripts:
  - `scripts/seed-editor-transcript.mjs`
  - `scripts/editor-api-smoke.mjs`
  - shared data copy in `scripts/fixtures/editor-api-fixture.mjs`
- The fixture module is a direct JS copy of the relevant `src/mocks/fixtures.ts` data and builders.
  - Reason: the repo does not include a TS-at-runtime loader for Node scripts, and adding one would violate the no-new-dependencies rule.
- `editor-api-smoke.mjs` derives the default function base URL from `VITE_SUPABASE_URL` when `VITE_EDITOR_API_BASE_URL` is not present locally.
  - Reason: the deployed Supabase Functions URL is deterministic, and this keeps local verification from depending on extra `.env` setup.
- Local verification used the linked remote Supabase project and the deployed `editor-api` function, not a local stack.
- Seed fallback used authenticated anonymous-session writes when `SUPABASE_SERVICE_ROLE_KEY` was not present locally.
  - Scope note: this fallback is local-script-only and relies on the project's still-permissive authenticated RLS policies.
  - Deployed runtime code still uses caller JWT passthrough only and never uses the service role.

### Additive migration log

- `20260606113000_editor_api_working_rpc.sql`
  - applied via `npx supabase db push`
- `20260606114500_editor_api_resolve_suggestion_rpc.sql`
  - applied via `npx supabase db push`

### Verification

- `npm run typecheck` ✅
- `npm run test` ✅
- `npm run build` ✅
- `npx eslint scripts/seed-editor-transcript.mjs scripts/editor-api-smoke.mjs scripts/fixtures/editor-api-fixture.mjs` ✅
- `node scripts/seed-editor-transcript.mjs` against the linked remote project ✅
  - seeded transcript: `tr_editor_api_1780765775980`
  - auth mode: `anonymous-fallback`
- `npx supabase functions deploy editor-api` ✅
- `node scripts/editor-api-smoke.mjs` against the deployed function ✅
  - document ✅
  - working save + re-fetch + `raw_text` unchanged ✅
  - review ✅
  - speakers ✅
  - suggestions ✅
  - resolve accept + document mutation ✅
  - exhibits ✅
  - certify/status ✅

### Deferred

- Auth owner-scoping / tighter RLS remains deferred to the separate security task.
- DEV boot in MSW mode was smoke-checked only at the process level (`npm run dev` stayed alive until timeout); no separate browser session was used in this wiring task.

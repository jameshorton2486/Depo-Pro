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

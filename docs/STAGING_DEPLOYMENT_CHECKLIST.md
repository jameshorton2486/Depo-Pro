# Depo-Pro Staging Deployment Checklist

This checklist applies to the Vite/React embedded editor and its owner-scoped
Supabase schema. It intentionally does not assume Next.js routes, firm tenancy,
or tables that are not in this repository.

## Before deployment

- Confirm the intended Supabase project with `supabase status` and `supabase migration list`.
- Keep unrelated worktree changes out of the deployment. Do not use destructive Git commands to clean it.
- Run `npm test`, `npm run typecheck`, and `npm run build`.
- Confirm Edge Function secrets: `DEEPGRAM_API_KEY`, `ANTHROPIC_API_KEY`, and, if the watchdog is scheduled through pg_net, Vault secrets `project_url` and `service_role_key`.
- Leave `TRANSCRIPT_PRUNE_SUPERSEDED` unset until a multi-transcript validation case has been reviewed.

## Database and Storage

- Run `supabase db push` only against the confirmed staging project.
- Confirm the private `case-files` bucket exists.
- Verify owner-scoped RLS for `cases`, `case_audio`, `case_files`, `transcripts`, transcript child tables, `transcription_jobs`, `reporter_profiles`, and `speaker_resolution_current`.
- Verify Storage object paths begin with the authenticated user's ID and that select, insert, update, and delete requests are confined to that prefix.
- Confirm the `case_files_bucket_delete_owner` policy from migration `20260719003250_owner_scoped_storage_delete_policy.sql` is present.

## Edge Functions

Deploy the functions changed by the transcript pipeline:

```powershell
supabase functions deploy transcribe-start
supabase functions deploy transcribe-callback --no-verify-jwt
supabase functions deploy transcribe-watchdog
supabase functions deploy editor-api
```

- Confirm `transcribe-callback` remains reachable without JWT verification; its callback token is its authentication mechanism.
- Confirm the watchdog cron jobs are active when pg_cron/pg_net are used.

## Staging smoke test

- Create a synthetic staging case under User A.
- Verify User B cannot read or modify User A's case, audio, transcript, or storage object.
- Upload a short non-client audio sample; confirm signed playback works and refresh recovery preserves playback position.
- Run one multi-speaker transcription; confirm the Deepgram diarization entitlement and inspect speaker clustering before beta sign-off.
- Confirm the Workspace loads both Working and immutable Original views.
- Confirm UFM output shows cause numbers and state abbreviations in caps, lowercase emails, and correctly formatted ordinals; obtain reporter approval for certified-output rules.

## Go / no-go

Do not proceed to beta if migrations drift, owner isolation fails, Deepgram diarization fails for the selected model, or the Original snapshot is not captured. Record the deployed project ref, migration list, function versions, and smoke-test result.
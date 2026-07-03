# PROMPT 7 — Owner-scope RLS on the transcript family and `speaker_resolution_current`

**Context.** Transcript-family tables and `speaker_resolution_current` still use permissive authenticated policies, so any authenticated user can read or modify another tenant's transcript data.

**Task.**
1. Add a new migration that replaces the permissive transcript-family policies with owner-scoped equivalents, resolving ownership through the related case or transcript and using `(select auth.uid())` style consistent with existing hardening migrations.
2. Apply the same owner scoping to `speaker_resolution_current`.
3. Confirm service-role edge-function flows still work and client flows remain owner-scoped.

**Acceptance / verification.**
1. Provide the SQL plus an RLS test plan proving user B cannot read or update user A's transcript rows.
2. Apply the migration cleanly with `supabase db push` or `supabase db reset`.
3. Report the commit hash.

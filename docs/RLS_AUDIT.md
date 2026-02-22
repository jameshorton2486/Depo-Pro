# RLS Audit (Stream B.4)

Date: 2026-02-22
Scope: Public-schema RLS policy coverage and medical chronology tables.

## Audit commands

Run in Supabase SQL Editor:

1. `scripts/sql/verify-rls-policies.sql`
2. Export query results for evidence capture.

## Tables checked

- `profiles`
- `firms`
- `jobs`
- `transcriptions`
- `transcription_edits`
- `transcription_chunks`
- `flagged_words`
- `review_sessions`
- `audit_log`
- `medical_records`
- `chronology_entries`
- `calendar_events`
- `exhibits`

## Expected pass criteria

- Every table above reports `rowsecurity = true`.
- Policy list includes tenant-safe `USING`/`WITH CHECK` constraints.
- `medical_records` and `chronology_entries` both have active policies.

## Current repository status

- Verification SQL script added: `scripts/sql/verify-rls-policies.sql`
- Gap-remediation SQL included as commented blocks in that script.

## Live environment verification

The local workspace cannot directly verify Supabase project policy state without
live database credentials/session. Execute the SQL script in staging and prod,
then paste/export results in this document under:

- `### Staging results`
- `### Production results`

## Staging results

Pending live run.

## Production results

Pending live run.

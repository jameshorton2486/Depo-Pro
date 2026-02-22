# RLS Policy Audit - 2026-02-22

Scope: Stream B.4 verification for public-schema RLS coverage and policy completeness.

## Summary
- Total public tables: Pending live query
- Tables with RLS enabled: Pending live query
- Tables with RLS disabled: Pending live query
- Total policies: Pending live query

## Audit SQL
Run `scripts/sql/verify-rls-policies.sql` in Supabase SQL Editor.

## Critical Tables
| Table | RLS | SELECT | INSERT | UPDATE | DELETE | Notes |
|---|---|---|---|---|---|---|
| profiles | Pending | Pending | Pending | Pending | Pending | Own-profile model expected |
| firms | Pending | Pending | Pending | Pending | Pending | Admin/owner write controls expected |
| jobs | Pending | Pending | Pending | Pending | Pending | Firm-scoped access required |
| transcriptions | Pending | Pending | Pending | Pending | Pending | Must be job-firm scoped |
| transcription_edits | Pending | Pending | Pending | Pending | Pending | Editor attribution required |
| flagged_words | Pending | Pending | Pending | Pending | Pending | Reviewer role checks expected |
| medical_records | Pending | Pending | Pending | Pending | Pending | PHI, strict firm scoping |
| chronology_entries | Pending | Pending | Pending | Pending | Pending | PHI adjacency via job scope |
| invoices | Pending | Pending | Pending | Pending | Pending | Billing isolation required |
| audit_log / audit_logs | Pending | Pending | Pending | Pending | Pending | Prefer immutable write-once |

## Tables Checked (Current Stream)
- `profiles`
- `firms`
- `jobs`
- `transcriptions`
- `transcription_edits`
- `transcription_chunks`
- `flagged_words`
- `review_sessions`
- `audit_log`
- `audit_logs` (if present)
- `medical_records`
- `chronology_entries`
- `calendar_events`
- `exhibits`

## Gaps Found and Fixed
1. Pending live run.

## Tables Intentionally Without RLS
- Pending live run and architecture sign-off.

## Staging Results
Pending live run.

## Production Results
Pending live run.

## Evidence
- Attach SQL Editor screenshots for:
1. `pg_tables` RLS summary query
2. `pg_policies` full inventory query
3. medical chronology policy query output

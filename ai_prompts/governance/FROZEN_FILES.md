# Frozen Files Registry

AI agents must not modify any file listed here.

## Permanently Frozen

| File                          | Reason                              |
|-------------------------------|-------------------------------------|
| lib/supabase/server.ts        | Auth architecture — SSR client      |
| lib/supabase/client.ts        | Auth architecture — browser client  |
| lib/auth/session.ts           | Auth architecture — session helper  |
| middleware.ts                 | Auth architecture — route guard     |

## Append-Only

| Path                       | Rule                                         |
|----------------------------|----------------------------------------------|
| supabase/migrations/**     | New files allowed; existing files never edited|
| audit_log (DB table)       | INSERT only, no UPDATE, no DELETE             |
| transcript_flags (DB)      | INSERT only for flag creation                 |
| export_certifications (DB) | INSERT only                                   |

## Immutable DB Columns

| Table            | Column              | Rule                          |
|------------------|---------------------|-------------------------------|
| transcript_words | original_word       | Set once on ingest, never changed |
| transcriptions   | deepgram_raw_json   | Set once on ingest, never changed |
| transcript_words | (hard delete)       | Blocked at DB layer            |

# PROMPT 2 Blocker Report

Date: 2026-06-05
Prompt: `PROMPT 2 (v2) — DURABLE FILE STORAGE: Uploads That Survive Refresh`
Status: Blocked at Task 0 persistence verification gate

## Summary

The live Supabase round-trip reached the real project successfully and proved that:

- insert works
- update works
- `updated_at` advances
- archival via `payload.archived = true` works

However, Task 0 required a **byte-identical payload round-trip assertion** after the initial insert. That assertion failed on the first read-back.

Per the prompt instructions, work stops here and Task 1+ were not started.

## Exact Failing Step

Step: `read row back`

Verifier output:

```text
PASS insert row
{
  "id": "ecca9479-ce58-466f-bfae-173934786dc2",
  "case_id": "case_verify_1780681376883",
  "version": "1.0",
  "proceeding_type": "freelance_deposition",
  "stage": "intake",
  "notes": "",
  "payload": {
    "case_id": "case_verify_1780681376883",
    "created_at": "2026-06-05T17:42:56.883Z",
    "verification": true
  },
  "created_at": "2026-06-05T17:42:57.234233+00:00",
  "updated_at": "2026-06-05T17:42:57.234233+00:00"
}
FAIL read row back
payload mismatch after insert
expected: {"verification":true,"case_id":"case_verify_1780681376883","created_at":"2026-06-05T17:42:56.883Z"}
actual:   {"case_id":"case_verify_1780681376883","created_at":"2026-06-05T17:42:56.883Z","verification":true}
PASS update payload
PASS read updated row
PASS mark archived
```

## Suspected Cause

This does **not** look like an auth, RLS, env, or connectivity failure.

Likely cause:

- `cases.payload` is stored as `jsonb`
- PostgreSQL `jsonb` does not preserve insertion key order
- the logical object round-tripped correctly, but the serialized key order changed

That means the Task 0 requirement of **byte-identical payload equality** is stricter than current `jsonb` behavior allows.

## Evidence

Schema reference:

- [supabase/migrations/20260603210000_create_core_schema.sql](../supabase/migrations/20260603210000_create_core_schema.sql:45)

Relevant line:

```sql
payload jsonb not null default '{}'::jsonb,
```

## Live Row Used

- `case_id`: `case_verify_1780681376883`
- `id`: `ecca9479-ce58-466f-bfae-173934786dc2`

## Assessment

The persistence layer appears functionally reachable and writable, but the gate as written failed because serialized `jsonb` output was not byte-identical to the inserted JSON string.

No further Prompt 2 work was performed.

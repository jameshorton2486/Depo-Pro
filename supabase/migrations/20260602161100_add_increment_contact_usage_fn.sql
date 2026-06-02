/*
  # Add increment_contact_usage RPC function

  ## Summary
  Adds a lightweight Postgres function callable via `supabase.rpc()` to atomically
  increment the `times_used` counter on a contact row, avoiding a round-trip read.

  ## New Functions
  - `increment_contact_usage(contact_id uuid)` — adds 1 to `contacts.times_used`

  ## Notes
  1. `SECURITY DEFINER` is intentionally NOT used; the caller's RLS policies apply.
  2. Returns void; callers do not need the updated row.
*/

CREATE OR REPLACE FUNCTION increment_contact_usage(contact_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE contacts SET times_used = times_used + 1 WHERE id = contact_id;
$$;

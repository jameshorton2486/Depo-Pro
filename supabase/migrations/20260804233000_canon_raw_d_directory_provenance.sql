/*
  # CANON-RAW-001 RAW-D — provenance column on contacts + firms

  Adds a per-row provenance map (field name -> {rawInput, policyId, policyVersion})
  to the directory tables, so governed values (attorney/contact names, phone
  numbers, firm details) retain their raw pre-normalization input and policy stamp.

  Owner-approved data-retention decision (2026-08-04): legal-matter directory data
  keeps full provenance — a permanent second, unnormalized copy of these values.

  ## Safety
  - ADDITIVE ONLY: one new nullable JSONB column per table.
  - No column drops, renames, type changes, or tightened constraints.
  - No UPDATE/DELETE of existing rows. Nullable ADD COLUMN is non-blocking in
    Postgres (no table rewrite). Existing rows keep NULL.
  - Each ALTER in its own transaction so one failure doesn't roll back the other.
*/

BEGIN;

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS provenance JSONB;

COMMENT ON COLUMN contacts.provenance IS
  'CANON-RAW-001: map of governed field name -> {rawInput, policyId, policyVersion}. NULL for legacy pre-RAW-D rows.';

COMMIT;

BEGIN;

ALTER TABLE firms
  ADD COLUMN IF NOT EXISTS provenance JSONB;

COMMENT ON COLUMN firms.provenance IS
  'CANON-RAW-001: map of governed field name -> {rawInput, policyId, policyVersion}. NULL for legacy pre-RAW-D rows.';

COMMIT;

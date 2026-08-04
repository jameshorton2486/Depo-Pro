/*
  # CANON-RAW-001 RAW-B — provenance columns on field_provenance

  Adds the raw pre-normalization input and the canonical policy identity+version
  to each provenance event, so a certified governed value is byte-reproducible
  (persist raw, derive canonical). See ADR / CANON-RAW-001.

  ## Safety
  - ADDITIVE ONLY: three new columns, all NULLABLE, no defaults that rewrite rows.
  - No column drops, renames, type changes, or tightened constraints.
  - No UPDATE/DELETE of existing rows. ADD COLUMN (nullable) is non-blocking in
    Postgres — no table rewrite, no long lock.
  - Wrapped in a single transaction.

  Existing rows keep NULL for these columns (no backfill applied here; backfill
  scope is assessed separately in RAW-E).
*/

BEGIN;

ALTER TABLE field_provenance
  ADD COLUMN IF NOT EXISTS raw_value      TEXT,
  ADD COLUMN IF NOT EXISTS policy_id      TEXT,
  ADD COLUMN IF NOT EXISTS policy_version TEXT;

COMMENT ON COLUMN field_provenance.raw_value IS
  'CANON-RAW-001: verbatim pre-normalization input for a governed field, before the canonical policy ran. NULL for non-governed fields and pre-RAW-B rows.';
COMMENT ON COLUMN field_provenance.policy_id IS
  'CANON-RAW-001: the canonical field policy that produced value (e.g. caption.case_number).';
COMMENT ON COLUMN field_provenance.policy_version IS
  'CANON-RAW-001: the policy version at write time, for byte-reproducibility.';

COMMIT;

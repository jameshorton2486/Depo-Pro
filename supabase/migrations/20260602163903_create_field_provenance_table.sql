/*
  # Create field_provenance table

  ## Purpose
  Stores the full resolution history for every extracted field conflict
  in DEPO-PRO. Each row is an immutable audit event — events are only
  ever appended, never updated or deleted.

  ## New Tables

  ### `field_provenance`
  One row per provenance event (initial extraction or conflict resolution).

  | Column | Type | Notes |
  |---|---|---|
  | `id` | uuid PK | Auto-generated |
  | `case_id` | text | Logical case identifier (not a FK — cases live in app memory for MVP) |
  | `field_path` | text | Dot-path into CaseRecord, e.g. `witnesses[0].name` |
  | `field_label` | text | Human-readable label, e.g. "Witness 1 — Name" |
  | `event_type` | text | `extracted` \| `conflict_detected` \| `conflict_resolved` \| `confirmed` \| `manual_edit` |
  | `value` | text | The value at the time of this event |
  | `source` | text | Display source label (Notice, Job Sheet, Reporter Profile, etc.) |
  | `winning_value` | text | For `conflict_resolved` events: the accepted value |
  | `rejected_value` | text | For `conflict_resolved` events: the value that was not chosen |
  | `rejected_source` | text | For `conflict_resolved` events: source of the rejected value |
  | `confidence_score` | float | Extraction confidence 0.0–1.0, null for manual |
  | `resolution_user` | text | Operator identifier (default: "reporter" for MVP single-user) |
  | `resolved_at` | timestamptz | When this event occurred |

  ## Security
  - RLS enabled, restricted to authenticated users (anon key pattern for MVP)
  - Single policy: authenticated users can insert and select their own events
    via a session-scoped user identifier stored in `resolution_user`.
    For MVP single-user, we allow all authenticated reads/inserts.

  ## Notes
  1. This table is append-only. No UPDATE or DELETE policies are created.
  2. `case_id` is a plain text field matching the CaseRecord.case_id string.
     No foreign key to a cases table since cases are in-memory for the MVP.
  3. `event_type = 'conflict_resolved'` rows always populate both
     `winning_value` and `rejected_value`.
*/

CREATE TABLE IF NOT EXISTS field_provenance (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           text        NOT NULL,
  field_path        text        NOT NULL,
  field_label       text        NOT NULL DEFAULT '',
  event_type        text        NOT NULL CHECK (event_type IN (
                                  'extracted',
                                  'conflict_detected',
                                  'conflict_resolved',
                                  'confirmed',
                                  'manual_edit'
                                )),
  value             text        NOT NULL DEFAULT '',
  source            text        NOT NULL DEFAULT '',
  winning_value     text,
  rejected_value    text,
  rejected_source   text,
  confidence_score  float,
  resolution_user   text        NOT NULL DEFAULT 'reporter',
  resolved_at       timestamptz NOT NULL DEFAULT now()
);

-- Index for the most common query pattern: fetch history for a specific
-- case + field path ordered by time
CREATE INDEX IF NOT EXISTS field_provenance_case_path_idx
  ON field_provenance (case_id, field_path, resolved_at DESC);

-- Index for fetching all conflict events for a case (used in conflict queue)
CREATE INDEX IF NOT EXISTS field_provenance_case_event_idx
  ON field_provenance (case_id, event_type, resolved_at DESC);

ALTER TABLE field_provenance ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users may read provenance records
CREATE POLICY "Authenticated users can read provenance"
  ON field_provenance
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- INSERT: authenticated users may append provenance events
CREATE POLICY "Authenticated users can insert provenance"
  ON field_provenance
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

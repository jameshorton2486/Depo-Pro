-- DOC-0325 line_type migration — GATE 1B: deterministic legacy-state backfill.
--
-- Split out of 20260810180000_line_type_review_contract.sql (which is now Gate 1A, schema
-- only) so the row-mutating backfill carries its own Human authorization per DOC-0331. Depends
-- on the Gate 1A schema (transcript_utterances.line_type_review_status must already exist).
--
-- Semantics: a prior manual reassignment (manually_reassigned = true) is a human override of
-- structure, so its review state maps to OVERRIDDEN. This is the LAST CLEAN ABANDONMENT POINT
-- once applied (DOC-0331 §C): it mutates rows, but deterministically and recoverably.
--
-- Deterministic + idempotent: the WHERE guard `line_type_review_status = 'UNREVIEWED'` means a
-- second execution changes ZERO additional rows, and the source flag `manually_reassigned` is
-- preserved, so the pre-backfill state is exactly recomputable (least-destructive recovery does
-- NOT require a backup restore — see DOC-0331 Gate 1B rollback). Touches only the new
-- review-status column; never line_type itself.
--
-- NOT applied to production by this local implementation: applying is a Human Gate (DOC-0331
-- Gate 1B), authorized separately from and after Gate 1A.

update public.transcript_utterances
  set line_type_review_status = 'OVERRIDDEN'
  where manually_reassigned = true
    and line_type_review_status = 'UNREVIEWED';

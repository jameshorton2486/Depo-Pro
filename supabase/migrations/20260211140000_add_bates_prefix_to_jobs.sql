-- Add bates_prefix column to jobs table for Bates numbering
-- Allows configurable prefix per job (e.g., "SMITH" → "SMITH-001", "SMITH-002")
-- Null prefix means simple numbering ("1", "2", "3")

alter table jobs
add column if not exists bates_prefix text default null;

comment on column jobs.bates_prefix is 'Optional Bates numbering prefix for exhibits (e.g., "SMITH" produces "SMITH-001")';

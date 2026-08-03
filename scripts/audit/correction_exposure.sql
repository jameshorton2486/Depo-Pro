-- =============================================================================
-- correction_exposure.sql  (Prompt A, Part 3) — READ-ONLY / UNEXECUTED
-- Branch audit/correction-recording @ 9f0750df1fd3744b729f64e961f6c5d81fc775c9
--
-- Purpose: quantify historical exposure from content changes applied before the
-- A1/A5 recording+marking conditions were required.
--
-- SELECT-only. No DML/DDL. Every query states its schema assumptions inline.
-- Verified schema sources:
--   corrections / correction_runs / correction_decisions
--       supabase/migrations/20260729120000_corrections.sql:27-72,93-111
--   transcript_words (raw_text immutable trigger :203-219; working_text/edited/
--       ai_suggestion added later): supabase/migrations/20260603210000_create_core_schema.sql:176-219
--   transcript_utterances (is_synthetic): 20260627201000_add_boundary_fields.sql:1-4
--   transcript_audit_log (old_text/new_text/before_text/after_text/source/action;
--       NO engine or engine_version column):
--       20260603210000_create_core_schema.sql:233-245 + 20260605222208_transcript_persistence_v2.sql:249-255
--   case_certifications (certification_date lock): 20260603210000_create_core_schema.sql:346-355
--   transcripts (ai_review_meta jsonb, status): 20260603210000_create_core_schema.sql + 20260627195000
-- NOTE: transcript_audit_log has NO engine/engine_version column anywhere, so any
-- query needing per-change engine version off the audit log is a TEMPLATE, flagged below.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Q1. Which transcripts contain APPLIED corrections with NO correction record?
--   "Applied" evidence (two sources):
--     (a) transcript_audit_log rows from the AI paths (legacy auto-apply / accept),
--         action in ('ai_suggestion_auto_applied','ai_suggestion_accepted').
--     (b) transcript_words carrying an accepted AI overlay
--         (ai_suggestion IS NOT NULL AND ai_suggestion_status='accepted' AND text<>raw_text).
--   "No correction record" = no row in public.corrections for that transcript_id.
-- ASSUMPTION: transcript_words.ai_suggestion / ai_suggestion_status / text / raw_text
--   exist (raw_text verified create_core_schema.sql:184; ai_* added by later
--   migrations referenced in editor-api select editor-api/index.ts:342). If an
--   ai_* column is absent in a given DB, drop branch (b).
-- ---------------------------------------------------------------------------
with applied_audit as (
  select distinct al.transcript_id
  from public.transcript_audit_log al
  where al.action in ('ai_suggestion_auto_applied', 'ai_suggestion_accepted')
),
applied_words as (
  select distinct w.transcript_id
  from public.transcript_words w
  where w.ai_suggestion is not null
    and w.ai_suggestion_status = 'accepted'
    and w.text is distinct from w.raw_text
),
applied as (
  select transcript_id from applied_audit
  union
  select transcript_id from applied_words
)
select a.transcript_id
from applied a
where not exists (
  select 1 from public.corrections c
  where c.transcript_id = a.transcript_id
)
order by a.transcript_id;


-- ---------------------------------------------------------------------------
-- Q2. Which transcripts contain correction records MISSING original text or engine version?
--   corrections carries: change (jsonb), specialty (engine), prompt_version (engine version).
-- ASSUMPTION: corrections.change ->> 'before' is the ORIGINAL text field of the
--   CorrectionObject (schema/correction_object.schema.json, referenced
--   20260729120000_corrections.sql:7 — NOT opened in this audit; if the key is
--   named differently, adjust the ->> path). change/specialty/prompt_version cols
--   verified 20260729120000_corrections.sql:54,56,60.
-- ---------------------------------------------------------------------------
select
  c.transcript_id,
  c.id            as correction_id,
  (c.change ->> 'before') is null            as missing_original_text,   -- ASSUMPTION: change.before = original
  (c.prompt_version is null
     or btrim(c.prompt_version) = '')        as missing_engine_version,
  (c.specialty is null
     or btrim(c.specialty) = '')             as missing_engine
from public.corrections c
where (c.change ->> 'before') is null
   or c.prompt_version is null or btrim(c.prompt_version) = ''
   or c.specialty is null or btrim(c.specialty) = ''
order by c.transcript_id, c.created_at;

-- Q2b (TEMPLATE — engine version is UNRECORDED for the legacy audit-log path).
-- ASSUMPTION: transcript_audit_log.engine / engine_version assumed from the A1
--   requirement; NOT FOUND in migrations (create_core_schema.sql:233-245,
--   transcript_persistence_v2.sql:249-255) -> query is a template pending schema
--   confirmation. Written against the assumed names so the gap is obvious: if these
--   columns are ever added, this finds AI audit rows lacking them. As of HEAD,
--   EVERY ai_* audit row is "missing engine version" because the column does not exist.
select
  al.transcript_id,
  al.change_id,
  al.action
from public.transcript_audit_log al
where al.action in ('ai_suggestion_auto_applied', 'ai_suggestion_accepted')
  and (
        al.engine is null or btrim(al.engine) = ''            -- ASSUMPTION: transcript_audit_log.engine NOT FOUND
     or al.engine_version is null or btrim(al.engine_version) = ''  -- ASSUMPTION: transcript_audit_log.engine_version NOT FOUND
      )
order by al.transcript_id, al.created_at;


-- ---------------------------------------------------------------------------
-- Q3. Of the Q1 + Q2 sets, which transcripts are DELIVERED or CERTIFIED?
--   Certified = case_certifications.certification_date IS NOT NULL (lock,
--     20260722020816_enforce_certification_lock.sql:8). Join transcripts->cases->certs.
-- ASSUMPTION: "delivered" has no dedicated column verified in migrations. Nearest
--   verified signal is cases.stage (create_core_schema.sql:43-ish) and/or exports
--   rows (create_core_schema.sql:373). ASSUMPTION: cases.stage IN ('delivered',
--   'export','complete') denotes delivered; adjust to your stage vocabulary. If a
--   dedicated delivered flag exists, substitute it here.
-- ---------------------------------------------------------------------------
with applied_audit as (
  select distinct transcript_id from public.transcript_audit_log
  where action in ('ai_suggestion_auto_applied', 'ai_suggestion_accepted')
),
applied_words as (
  select distinct transcript_id from public.transcript_words
  where ai_suggestion is not null and ai_suggestion_status = 'accepted'
    and text is distinct from raw_text
),
no_record as (   -- Q1 population
  select transcript_id from (
    select transcript_id from applied_audit
    union select transcript_id from applied_words
  ) a
  where not exists (select 1 from public.corrections c where c.transcript_id = a.transcript_id)
),
bad_record as ( -- Q2 population
  select distinct transcript_id from public.corrections c
  where (c.change ->> 'before') is null                 -- ASSUMPTION: change.before = original
     or c.prompt_version is null or btrim(c.prompt_version) = ''
     or c.specialty is null or btrim(c.specialty) = ''
),
affected as (
  select transcript_id, 'no_record'::text as exposure from no_record
  union all
  select transcript_id, 'bad_record'::text as exposure from bad_record
)
select
  af.transcript_id,
  af.exposure,
  t.case_id,
  ca.stage,
  (cc.certification_date is not null) as is_certified,
  cc.certification_date,
  -- ASSUMPTION: delivered heuristic on cases.stage; refine to real vocabulary.
  (ca.stage in ('delivered', 'export', 'complete')) as is_delivered_assumed
from affected af
join public.transcripts t     on t.transcript_id = af.transcript_id
left join public.cases ca     on ca.case_id = t.case_id
left join public.case_certifications cc on cc.case_id = t.case_id
where cc.certification_date is not null
   or ca.stage in ('delivered', 'export', 'complete')   -- ASSUMPTION as above
order by is_certified desc, af.transcript_id;


-- ---------------------------------------------------------------------------
-- Q4. For each affected transcript: count of changes, date range, originating
--     engine, and whether original text is recoverable.
--   Recoverability rule: word-level Deepgram original is ALWAYS recoverable because
--     transcript_words.raw_text is immutable (trigger reject_raw_text_change,
--     create_core_schema.sql:203-219). So "recoverable" is TRUE wherever the change
--     maps to surviving word rows. We still report the per-source engine attribution.
-- Part A: audit-log applied changes (engine is only 'source'; engine_version absent).
-- ---------------------------------------------------------------------------
select
  al.transcript_id,
  count(*)                              as change_count,
  min(al.created_at)                    as first_change_at,
  max(al.created_at)                    as last_change_at,
  -- Engine attribution available on the audit log is coarse: source + action only.
  string_agg(distinct al.source, ',')   as engine_source,   -- e.g. 'ai_review','editor'
  string_agg(distinct al.action, ',')   as actions,
  true                                  as original_text_recoverable  -- raw_text immutable (create_core_schema.sql:203-219)
from public.transcript_audit_log al
where al.action in ('ai_suggestion_auto_applied', 'ai_suggestion_accepted')
group by al.transcript_id
order by al.transcript_id;

-- Part B: corrections-table applied changes (engine + version present).
-- ASSUMPTION: downstream ->> 'applied_to_working_transcript' = 'true' marks an
--   applied correction (downstream jsonb verified 20260729120000_corrections.sql:68;
--   key name from editor-api/index.ts:1644-1646).
select
  c.transcript_id,
  count(*)                                          as applied_correction_count,
  min(c.created_at)                                 as first_at,
  max(c.created_at)                                 as last_at,
  string_agg(distinct c.specialty, ',')             as engines,          -- originating engine
  string_agg(distinct c.prompt_version, ',')        as engine_versions,  -- engine version
  bool_and((c.change ->> 'before') is not null)     as original_text_recorded  -- ASSUMPTION: change.before
from public.corrections c
where (c.downstream ->> 'applied_to_working_transcript') = 'true'   -- ASSUMPTION: applied flag key
group by c.transcript_id
order by c.transcript_id;


-- ---------------------------------------------------------------------------
-- Q5. Which AUTHORITATIVE utterances lack Deepgram provenance?
--   Synthetic (AI-generated boundary) utterances are the population with no
--   Deepgram origin: transcript_utterances.is_synthetic = true and/or the sentinel
--   boundary speaker id 'spk_synthetic_boundary' (transcriptFinalize.ts:170,631).
-- Verified: is_synthetic column (20260627201000_add_boundary_fields.sql:4).
-- ASSUMPTION: 'spk_synthetic_boundary' is the only synthetic sentinel speaker_id
--   (transcriptFinalize.ts:170); editor-api can also create 'spk_synthetic_%' speakers
--   (editor-api/index.ts:676) — those are human-added, not AI, so excluded by name filter.
-- ---------------------------------------------------------------------------
select
  u.transcript_id,
  u.utterance_id,
  u.speaker_id,
  u.is_synthetic,
  u.text,
  -- No correction/audit record backs these AI insertions; provenance is the flag only.
  not exists (
    select 1 from public.corrections c
    where c.transcript_id = u.transcript_id
      and (c.location ->> 'paragraph_id') = u.utterance_id   -- ASSUMPTION: corrections.location.paragraph_id
  ) as has_no_correction_record
from public.transcript_utterances u
where u.is_synthetic = true
   or u.speaker_id = 'spk_synthetic_boundary'   -- ASSUMPTION: sentinel (transcriptFinalize.ts:170)
order by u.transcript_id, u.utterance_index;

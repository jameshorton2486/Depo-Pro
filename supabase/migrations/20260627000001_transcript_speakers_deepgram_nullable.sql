-- P4 Step 1: Allow synthetic speakers without Deepgram diarization clusters
-- Pre-flight audit: docs/audits/PARTICIPANT_DIRECTORY_PREREQ_AUDIT.md
-- Required by: Participant Directory feature (post-beta)

ALTER TABLE transcript_speakers
  ALTER COLUMN deepgram_speaker DROP NOT NULL;

COMMENT ON COLUMN transcript_speakers.deepgram_speaker IS
  'Deepgram diarization cluster index. NULL for synthetic speakers created
   by the reporter that have no corresponding Deepgram cluster (e.g. a
   second attorney Deepgram merged into another cluster, or THE VIDEOGRAPHER
   when identified by pattern matching rather than a distinct cluster).';

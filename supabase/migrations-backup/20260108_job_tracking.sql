-- ═══════════════════════════════════════════════════════════════════════════
-- JOB TRACKING ENHANCEMENTS
-- Additional fields for better job monitoring and debugging
-- Applied: 2026-01-08
-- ═══════════════════════════════════════════════════════════════════════════

-- Add new tracking columns to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_attempts INTEGER DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_error_code TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_error_message TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS transcription_duration_ms INTEGER;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS audio_duration_seconds DECIMAL(10,2);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS queue_position INTEGER;

-- Index for finding failed jobs
CREATE INDEX IF NOT EXISTS idx_job_status_error 
ON jobs(status) WHERE last_error_code IS NOT NULL;

-- Index for processing time analysis
CREATE INDEX IF NOT EXISTS idx_job_processing_time 
ON jobs(processing_completed_at DESC) WHERE status = 'AI_COMPLETE';

-- Comments
COMMENT ON COLUMN jobs.job_attempts IS 'Number of transcription attempts made';
COMMENT ON COLUMN jobs.last_error_code IS 'Error code from last failed attempt';
COMMENT ON COLUMN jobs.last_error_message IS 'Error message from last failed attempt';
COMMENT ON COLUMN jobs.processing_started_at IS 'When transcription processing started';
COMMENT ON COLUMN jobs.processing_completed_at IS 'When transcription processing completed';
COMMENT ON COLUMN jobs.transcription_duration_ms IS 'Time taken to transcribe (milliseconds)';
COMMENT ON COLUMN jobs.audio_duration_seconds IS 'Duration of audio file in seconds';
COMMENT ON COLUMN jobs.queue_position IS 'Position in queue when job was created';

-- Add format_settings column for transcript formatting configuration
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS format_settings JSONB DEFAULT NULL;

COMMENT ON COLUMN jobs.format_settings IS
'Speaker mappings, Q/A sections, formatting options for legal transcript export. Schema: TranscriptFormatConfig from src/types/transcript-format.ts';

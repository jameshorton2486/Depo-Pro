-- ============================================================================
-- ENTITY EXTRACTION & KNOWLEDGE GRAPH SCHEMA
-- Migration: 20260213_entity_extraction_knowledge_graph.sql
--
-- Purpose: Store extracted entities from deposition transcripts and their
-- relationships to build an evidence knowledge graph.
--
-- Tables:
-- - extracted_entities: Individual entities (people, dates, medical terms, etc.)
-- - entity_relations: Relationships between entities
-- - entity_mentions: Track all mentions of entities across transcripts
-- ============================================================================

-- ============================================================================
-- EXTRACTED_ENTITIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS extracted_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity identification
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'PERSON', 'MEDICAL', 'DATE', 'MONETARY', 'LOCATION',
    'ORGANIZATION', 'LEGAL', 'VEHICLE', 'MEASUREMENT',
    'DOCUMENT', 'INJURY', 'TREATMENT'
  )),

  -- Entity content
  text TEXT NOT NULL,
  normalized TEXT NOT NULL, -- Lowercased, standardized form

  -- Entity classification
  role TEXT CHECK (role IN (
    'PLAINTIFF', 'DEFENDANT', 'WITNESS', 'ATTORNEY',
    'MEDICAL_PROVIDER', 'EXPERT', 'THIRD_PARTY', 'UNKNOWN'
  )),

  -- Confidence and context
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  word_indices INTEGER[] NOT NULL, -- Word indices in transcript
  time_ranges JSONB, -- Array of {start, end} time ranges
  context TEXT[], -- Surrounding words for disambiguation

  -- Metadata (type-specific information)
  metadata JSONB DEFAULT '{}',

  -- Source tracking
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  segment_index INTEGER, -- Which segment this entity appears in

  -- Timestamps
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(text, '') || ' ' || coalesce(normalized, ''))
  ) STORED
);

-- ============================================================================
-- ENTITY_RELATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationship endpoints
  source_entity_id UUID NOT NULL REFERENCES extracted_entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES extracted_entities(id) ON DELETE CASCADE,

  -- Relationship type
  relation_type TEXT NOT NULL CHECK (relation_type IN (
    'TREATED_BY', 'DIAGNOSED_WITH', 'OCCURRED_ON', 'LOCATED_AT',
    'EMPLOYED_BY', 'PRESCRIBED', 'MENTIONED_IN', 'PAID_BY',
    'CAUSED_BY', 'RESULTED_IN', 'WITNESSED_BY', 'OWNS', 'INVOLVED_IN'
  )),

  -- Confidence and evidence
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence TEXT[], -- Supporting text for this relationship
  word_indices INTEGER[], -- Word indices where relationship is expressed

  -- Additional properties
  properties JSONB DEFAULT '{}',

  -- Source tracking
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Timestamps
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate relations
  CONSTRAINT unique_entity_relation UNIQUE (source_entity_id, target_entity_id, relation_type)
);

-- ============================================================================
-- ENTITY_MENTIONS TABLE
-- Track all mentions of an entity across multiple transcripts
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity reference
  entity_id UUID NOT NULL REFERENCES extracted_entities(id) ON DELETE CASCADE,

  -- Mention location
  transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  word_index INTEGER NOT NULL,

  -- Mention context
  context_before TEXT[],
  context_after TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Extracted entities indexes
CREATE INDEX IF NOT EXISTS idx_extracted_entities_type
  ON extracted_entities(entity_type);

CREATE INDEX IF NOT EXISTS idx_extracted_entities_transcription
  ON extracted_entities(transcription_id);

CREATE INDEX IF NOT EXISTS idx_extracted_entities_job
  ON extracted_entities(job_id);

CREATE INDEX IF NOT EXISTS idx_extracted_entities_firm
  ON extracted_entities(firm_id);

CREATE INDEX IF NOT EXISTS idx_extracted_entities_normalized
  ON extracted_entities(normalized);

CREATE INDEX IF NOT EXISTS idx_extracted_entities_role
  ON extracted_entities(role) WHERE role IS NOT NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_extracted_entities_search
  ON extracted_entities USING GIN(search_vector);

-- Entity relations indexes
CREATE INDEX IF NOT EXISTS idx_entity_relations_source
  ON entity_relations(source_entity_id);

CREATE INDEX IF NOT EXISTS idx_entity_relations_target
  ON entity_relations(target_entity_id);

CREATE INDEX IF NOT EXISTS idx_entity_relations_type
  ON entity_relations(relation_type);

CREATE INDEX IF NOT EXISTS idx_entity_relations_transcription
  ON entity_relations(transcription_id);

CREATE INDEX IF NOT EXISTS idx_entity_relations_job
  ON entity_relations(job_id);

-- Entity mentions indexes
CREATE INDEX IF NOT EXISTS idx_entity_mentions_entity
  ON entity_mentions(entity_id);

CREATE INDEX IF NOT EXISTS idx_entity_mentions_transcription
  ON entity_mentions(transcription_id);

CREATE INDEX IF NOT EXISTS idx_entity_mentions_job
  ON entity_mentions(job_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE extracted_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_mentions ENABLE ROW LEVEL SECURITY;

-- Extracted entities policies
CREATE POLICY "Users can view entities from their firm's jobs"
  ON extracted_entities FOR SELECT
  USING (
    firm_id IN (
      SELECT firm_id FROM user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert entities"
  ON extracted_entities FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update entities"
  ON extracted_entities FOR UPDATE
  USING (true);

-- Entity relations policies
CREATE POLICY "Users can view relations from their firm's jobs"
  ON entity_relations FOR SELECT
  USING (
    job_id IN (
      SELECT j.id FROM jobs j
      JOIN user_profiles up ON up.firm_id = j.firm_id
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "System can insert relations"
  ON entity_relations FOR INSERT
  WITH CHECK (true);

-- Entity mentions policies
CREATE POLICY "Users can view mentions from their firm's jobs"
  ON entity_mentions FOR SELECT
  USING (
    job_id IN (
      SELECT j.id FROM jobs j
      JOIN user_profiles up ON up.firm_id = j.firm_id
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "System can insert mentions"
  ON entity_mentions FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

/**
 * Get all entities for a job grouped by type
 */
CREATE OR REPLACE FUNCTION get_entities_by_type(p_job_id UUID)
RETURNS TABLE (
  entity_type TEXT,
  entity_count BIGINT,
  entities JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.entity_type,
    COUNT(*)::BIGINT,
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'text', e.text,
        'normalized', e.normalized,
        'role', e.role,
        'confidence', e.confidence,
        'metadata', e.metadata
      )
      ORDER BY e.confidence DESC
    )
  FROM extracted_entities e
  WHERE e.job_id = p_job_id
  GROUP BY e.entity_type
  ORDER BY entity_type;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Find connected entities (depth = 1)
 */
CREATE OR REPLACE FUNCTION get_connected_entities(p_entity_id UUID)
RETURNS TABLE (
  entity_id UUID,
  entity_type TEXT,
  text TEXT,
  relation_type TEXT,
  confidence NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  -- Outgoing relations
  SELECT
    e.id,
    e.entity_type,
    e.text,
    r.relation_type,
    r.confidence
  FROM entity_relations r
  JOIN extracted_entities e ON e.id = r.target_entity_id
  WHERE r.source_entity_id = p_entity_id

  UNION

  -- Incoming relations
  SELECT
    e.id,
    e.entity_type,
    e.text,
    r.relation_type,
    r.confidence
  FROM entity_relations r
  JOIN extracted_entities e ON e.id = r.source_entity_id
  WHERE r.target_entity_id = p_entity_id;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get entity timeline (chronological order)
 */
CREATE OR REPLACE FUNCTION get_entity_timeline(p_job_id UUID)
RETURNS TABLE (
  event_date DATE,
  entity_count BIGINT,
  entities JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (metadata->>'isoDate')::DATE AS event_date,
    COUNT(*)::BIGINT,
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'type', entity_type,
        'text', text,
        'metadata', metadata
      )
    )
  FROM extracted_entities
  WHERE
    job_id = p_job_id
    AND entity_type = 'DATE'
    AND metadata->>'isoDate' IS NOT NULL
  GROUP BY event_date
  ORDER BY event_date;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Search entities by text
 */
CREATE OR REPLACE FUNCTION search_entities(
  p_search_text TEXT,
  p_firm_id UUID DEFAULT NULL,
  p_entity_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  text TEXT,
  normalized TEXT,
  confidence NUMERIC,
  job_id UUID,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.entity_type,
    e.text,
    e.normalized,
    e.confidence,
    e.job_id,
    ts_rank(e.search_vector, websearch_to_tsquery('english', p_search_text)) AS rank
  FROM extracted_entities e
  WHERE
    e.search_vector @@ websearch_to_tsquery('english', p_search_text)
    AND (p_firm_id IS NULL OR e.firm_id = p_firm_id)
    AND (p_entity_types IS NULL OR e.entity_type = ANY(p_entity_types))
  ORDER BY rank DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_extracted_entities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_extracted_entities_updated_at
  BEFORE UPDATE ON extracted_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_extracted_entities_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE extracted_entities IS 'Extracted entities from deposition transcripts for knowledge graph';
COMMENT ON TABLE entity_relations IS 'Relationships between extracted entities';
COMMENT ON TABLE entity_mentions IS 'All mentions of entities across transcripts';

COMMENT ON COLUMN extracted_entities.metadata IS 'Type-specific metadata: person (title, credentials), medical (icd10Code), date (isoDate), monetary (amount), etc.';
COMMENT ON COLUMN extracted_entities.word_indices IS 'Array of word indices in transcript where entity appears';
COMMENT ON COLUMN extracted_entities.time_ranges IS 'Array of {start, end} time ranges in seconds';
COMMENT ON COLUMN extracted_entities.context IS 'Surrounding words for disambiguation (3 before, 3 after)';

COMMENT ON COLUMN entity_relations.evidence IS 'Supporting text snippets that justify this relationship';
COMMENT ON COLUMN entity_relations.properties IS 'Additional relationship properties (e.g., dosage for PRESCRIBED)';

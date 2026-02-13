/**
 * Entity Type Definitions for Knowledge Graph
 *
 * Entities are extracted from deposition transcripts to build
 * an evidence knowledge graph that connects facts, people, dates,
 * medical information, and legal concepts across cases.
 */

export type EntityType =
  | 'PERSON'           // Names of people (witnesses, attorneys, doctors, parties)
  | 'MEDICAL'          // Diagnoses, procedures, medications, body parts, symptoms
  | 'DATE'             // Specific dates, time periods, durations
  | 'MONETARY'         // Dollar amounts, settlements, costs, damages
  | 'LOCATION'         // Addresses, cities, medical facilities, accident scenes
  | 'ORGANIZATION'     // Companies, hospitals, law firms, insurance companies
  | 'LEGAL'            // Case numbers, statutes, legal terms, court names
  | 'VEHICLE'          // Make, model, license plates, VINs
  | 'MEASUREMENT'      // Distances, weights, dimensions, speeds
  | 'DOCUMENT'         // Contracts, reports, medical records, exhibits
  | 'INJURY'           // Specific injuries, symptoms, impairments
  | 'TREATMENT';       // Medical treatments, therapies, surgeries

export type EntityRole =
  | 'PLAINTIFF'
  | 'DEFENDANT'
  | 'WITNESS'
  | 'ATTORNEY'
  | 'MEDICAL_PROVIDER'
  | 'EXPERT'
  | 'THIRD_PARTY'
  | 'UNKNOWN';

export type RelationType =
  | 'TREATED_BY'       // Person → Medical Provider
  | 'DIAGNOSED_WITH'   // Person → Medical Condition
  | 'OCCURRED_ON'      // Event → Date
  | 'LOCATED_AT'       // Event → Location
  | 'EMPLOYED_BY'      // Person → Organization
  | 'PRESCRIBED'       // Medical Provider → Medication
  | 'MENTIONED_IN'     // Entity → Document
  | 'PAID_BY'          // Monetary → Organization/Person
  | 'CAUSED_BY'        // Injury → Event/Person
  | 'RESULTED_IN'      // Event → Injury/Outcome
  | 'WITNESSED_BY'     // Event → Person
  | 'OWNS'             // Person → Vehicle/Property
  | 'INVOLVED_IN';     // Person → Event

export interface ExtractedEntity {
  /** Unique identifier */
  id: string;

  /** Entity type */
  type: EntityType;

  /** The actual text extracted */
  text: string;

  /** Normalized form (lowercase, standardized) */
  normalized: string;

  /** Role in the case (if applicable) */
  role?: EntityRole;

  /** Confidence score (0-1) */
  confidence: number;

  /** Word indices in transcript where entity appears */
  wordIndices: number[];

  /** Timestamp ranges where entity is mentioned */
  timeRanges: Array<{ start: number; end: number }>;

  /** Context around the mention (for disambiguation) */
  context: string[];

  /** Metadata specific to entity type */
  metadata?: EntityMetadata;

  /** Source information */
  source: {
    transcriptionId: string;
    jobId: string;
    segmentIndex?: number;
  };

  /** Extraction timestamp */
  extractedAt: string;
}

export interface EntityMetadata {
  // Person metadata
  title?: string;           // Dr., Mr., Mrs., Attorney
  firstName?: string;
  lastName?: string;
  credentials?: string[];   // MD, JD, PhD

  // Medical metadata
  icd10Code?: string;       // ICD-10 diagnosis code
  bodyPart?: string;        // Affected body part
  laterality?: string;      // Left, Right, Bilateral
  severity?: string;        // Mild, Moderate, Severe

  // Date metadata
  dateType?: 'SPECIFIC' | 'RANGE' | 'RELATIVE';
  isoDate?: string;         // ISO 8601 format
  startDate?: string;
  endDate?: string;

  // Monetary metadata
  amount?: number;
  currency?: string;
  category?: 'SETTLEMENT' | 'MEDICAL_BILL' | 'LOST_WAGES' | 'DAMAGES';

  // Location metadata
  addressType?: 'RESIDENCE' | 'MEDICAL_FACILITY' | 'ACCIDENT_SCENE' | 'WORKPLACE';
  city?: string;
  state?: string;
  zipCode?: string;

  // Organization metadata
  organizationType?: 'HOSPITAL' | 'LAW_FIRM' | 'INSURANCE' | 'EMPLOYER';

  // Vehicle metadata
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  licensePlate?: string;

  // Measurement metadata
  value?: number;
  unit?: string;           // mph, feet, pounds, etc.
}

export interface EntityRelation {
  /** Unique identifier */
  id: string;

  /** Source entity ID */
  sourceEntityId: string;

  /** Target entity ID */
  targetEntityId: string;

  /** Relationship type */
  type: RelationType;

  /** Confidence score (0-1) */
  confidence: number;

  /** Evidence for this relationship */
  evidence: string[];

  /** Word indices where relationship is expressed */
  wordIndices: number[];

  /** Timestamp when relationship was extracted */
  extractedAt: string;

  /** Additional properties */
  properties?: Record<string, any>;
}

export interface KnowledgeGraph {
  /** All extracted entities */
  entities: ExtractedEntity[];

  /** Relationships between entities */
  relations: EntityRelation[];

  /** Graph metadata */
  metadata: {
    jobId: string;
    transcriptionId: string;
    extractedAt: string;
    entityCount: number;
    relationCount: number;
    coverage: number; // % of transcript words covered by entities
  };
}

export interface EntityExtractionResult {
  /** Extracted entities */
  entities: ExtractedEntity[];

  /** Extraction statistics */
  stats: {
    totalWords: number;
    entitiesExtracted: number;
    byType: Record<EntityType, number>;
    coverage: number;
    avgConfidence: number;
  };

  /** Any errors or warnings */
  warnings: string[];
}

export interface EntitySearchQuery {
  /** Text to search for */
  text?: string;

  /** Entity types to filter by */
  types?: EntityType[];

  /** Roles to filter by */
  roles?: EntityRole[];

  /** Minimum confidence */
  minConfidence?: number;

  /** Job IDs to search within */
  jobIds?: string[];

  /** Date range */
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface EntityTimeline {
  /** Entities arranged in chronological order */
  events: Array<{
    date: string;
    entities: ExtractedEntity[];
    relations: EntityRelation[];
    description: string;
  }>;

  /** Timeline metadata */
  metadata: {
    startDate: string;
    endDate: string;
    totalEvents: number;
  };
}

export interface CoOccurrenceMatrix {
  /** Entity pairs that appear together */
  pairs: Array<{
    entity1Id: string;
    entity2Id: string;
    coOccurrenceCount: number;
    contexts: string[];
  }>;
}

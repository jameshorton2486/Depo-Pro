// lib/services/entity-extraction.ts
// Entity Extraction for Evidence Knowledge Graph
// Phase A: Rule-based pattern matching | Phase B: Claude AI semantic extraction

import { v4 as uuidv4 } from 'uuid';
import type {
  ExtractedEntity,
  EntityType,
  EntityRole,
  EntityExtractionResult,
  EntityMetadata,
} from '@/types/entities';
import type { TranscriptionWord } from '@/types/transcription';

// ============================================================================
// Pattern Definitions
// ============================================================================

/** Medical term patterns (ICD-10 common terms) */
const MEDICAL_PATTERNS = [
  // Spinal conditions
  /\b(disc herniation|herniated disc|bulging disc)\b/i,
  /\b(spinal stenosis|foraminal stenosis)\b/i,
  /\b(radiculopathy|neuropathy|sciatica)\b/i,
  /\b(spondylosis|spondylolisthesis)\b/i,
  /\b(L[1-5][-/]?L[1-5]|C[1-7][-/]?C[1-7]|T[1-9][-/]?T[1-9])\b/i, // Vertebrae

  // Injuries
  /\b(fracture|broken bone|compound fracture)\b/i,
  /\b(concussion|traumatic brain injury|TBI)\b/i,
  /\b(whiplash|soft tissue injury)\b/i,
  /\b(laceration|contusion|abrasion)\b/i,
  /\b(sprain|strain|torn ligament)\b/i,
  /\b(rotator cuff tear)\b/i,

  // Procedures
  /\b(surgery|surgical repair|operation)\b/i,
  /\b(MRI|CT scan|X[-\s]?ray|ultrasound)\b/i,
  /\b(physical therapy|PT|occupational therapy|OT)\b/i,
  /\b(injection|epidural|nerve block)\b/i,
  /\b(spinal fusion|laminectomy|discectomy)\b/i,

  // Medications
  /\b(oxycodone|hydrocodone|morphine|fentanyl)\b/i,
  /\b(ibuprofen|naproxen|acetaminophen|Tylenol)\b/i,
  /\b(gabapentin|Neurontin|Lyrica|pregabalin)\b/i,
  /\b(muscle relaxer|cyclobenzaprine|Flexeril)\b/i,

  // Symptoms
  /\b(pain|chronic pain|acute pain)\b/i,
  /\b(numbness|tingling|weakness)\b/i,
  /\b(limited range of motion|ROM|stiffness)\b/i,
  /\b(swelling|inflammation|bruising)\b/i,
];

/** Date patterns */
const DATE_PATTERNS = [
  // MM/DD/YYYY, M/D/YY
  /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/,
  // Month DD, YYYY
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  // Mon DD, YYYY (abbreviated)
  /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(\d{4})\b/i,
  // Relative dates
  /\b(yesterday|today|tomorrow|last\s+week|next\s+month|two\s+years\s+ago)\b/i,
];

/** Monetary amount patterns */
const MONETARY_PATTERNS = [
  /\$\s?[\d,]+(?:\.\d{2})?(?:\s*(?:million|thousand|billion))?/i,
  /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:thousand|million|billion)\s+dollars?\b/i,
];

/** Person name patterns (titles + capitalized words) */
const PERSON_TITLE_PATTERNS = [
  /\b(Dr\.?|Doctor|Physician)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,
  /\b(Mr\.?|Mrs\.?|Ms\.?|Miss)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,
  /\b(Attorney|Lawyer|Counselor|Judge)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i,
  /\b([A-Z][a-z]+)\s+([A-Z][a-z]+),?\s+(M\.?D\.?|D\.?O\.?|J\.?D\.?|Ph\.?D\.?|R\.?N\.?|P\.?A\.?)\b/,
];

/** Location patterns */
const LOCATION_PATTERNS = [
  // Hospitals, clinics, medical centers
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(Hospital|Medical Center|Clinic|Health Center|ER|Emergency Room)\b/,
  // Addresses with street numbers
  /\b\d+\s+[A-Z][a-z]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)\b/i,
  // City, State
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s+([A-Z]{2})\b/,
];

/** Vehicle patterns */
const VEHICLE_PATTERNS = [
  /\b(Ford|Chevrolet|Chevy|Toyota|Honda|Nissan|BMW|Mercedes|Audi|Volkswagen|VW)\s+([A-Z][a-z]+)\b/i,
  /\b(\d{4})\s+(Ford|Chevrolet|Chevy|Toyota|Honda|Nissan|BMW|Mercedes)\b/i,
  /\bLicense\s+(?:plate|number)[:;\s]+([A-Z0-9]{2,8})\b/i,
];

/** Measurement patterns */
const MEASUREMENT_PATTERNS = [
  /\b(\d+(?:\.\d+)?)\s*(mph|miles per hour)\b/i,
  /\b(\d+(?:\.\d+)?)\s*(feet|foot|ft|yards|yd|miles|mi)\b/i,
  /\b(\d+(?:\.\d+)?)\s*(pounds|lbs?|kilograms|kg)\b/i,
  /\b(\d+(?:\.\d+)?)\s*(inches|in|centimeters|cm)\b/i,
];

// ============================================================================
// Core Extraction Functions
// ============================================================================

/**
 * Extract entities from a transcript
 * Phase A: Rule-based pattern matching
 */
export function extractEntities(
  words: TranscriptionWord[],
  transcriptionId: string,
  jobId: string
): EntityExtractionResult {
  const entities: ExtractedEntity[] = [];
  const warnings: string[] = [];

  // Build full text for pattern matching
  const fullText = words.map((w) => w.punctuated_word || w.word).join(' ');

  // Extract each entity type
  entities.push(...extractMedicalEntities(words, fullText, transcriptionId, jobId));
  entities.push(...extractDateEntities(words, fullText, transcriptionId, jobId));
  entities.push(...extractMonetaryEntities(words, fullText, transcriptionId, jobId));
  entities.push(...extractPersonEntities(words, fullText, transcriptionId, jobId));
  entities.push(...extractLocationEntities(words, fullText, transcriptionId, jobId));
  entities.push(...extractVehicleEntities(words, fullText, transcriptionId, jobId));
  entities.push(...extractMeasurementEntities(words, fullText, transcriptionId, jobId));

  // Calculate statistics
  const byType: Record<string, number> = {};
  entities.forEach((e) => {
    byType[e.type] = (byType[e.type] || 0) + 1;
  });

  const totalConfidence = entities.reduce((sum, e) => sum + e.confidence, 0);
  const avgConfidence = entities.length > 0 ? totalConfidence / entities.length : 0;

  const uniqueWordIndices = new Set(entities.flatMap((e) => e.wordIndices));
  const coverage = words.length > 0 ? uniqueWordIndices.size / words.length : 0;

  return {
    entities,
    stats: {
      totalWords: words.length,
      entitiesExtracted: entities.length,
      byType: byType as Record<EntityType, number>,
      coverage,
      avgConfidence,
    },
    warnings,
  };
}

/**
 * Extract medical entities (diagnoses, procedures, medications, body parts)
 */
function extractMedicalEntities(
  words: TranscriptionWord[],
  fullText: string,
  transcriptionId: string,
  jobId: string
): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  MEDICAL_PATTERNS.forEach((pattern) => {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(fullText)) !== null) {
      const text = match[0];
      const startPos = match.index;
      const endPos = startPos + text.length;

      // Find word indices
      const { wordIndices, timeRanges, context } = findWordIndicesForMatch(
        words,
        fullText,
        startPos,
        endPos
      );

      if (wordIndices.length > 0) {
        entities.push({
          id: uuidv4(),
          type: 'MEDICAL',
          text,
          normalized: text.toLowerCase().replace(/[^\w\s-]/g, ''),
          confidence: 0.85, // Rule-based confidence
          wordIndices,
          timeRanges,
          context,
          source: { transcriptionId, jobId },
          extractedAt: new Date().toISOString(),
        });
      }
    }
  });

  return entities;
}

/**
 * Extract date entities
 */
function extractDateEntities(
  words: TranscriptionWord[],
  fullText: string,
  transcriptionId: string,
  jobId: string
): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  DATE_PATTERNS.forEach((pattern) => {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(fullText)) !== null) {
      const text = match[0];
      const startPos = match.index;
      const endPos = startPos + text.length;

      const { wordIndices, timeRanges, context } = findWordIndicesForMatch(
        words,
        fullText,
        startPos,
        endPos
      );

      if (wordIndices.length > 0) {
        // Parse date
        const metadata: EntityMetadata = {};
        const isoDate = parseDate(text);
        if (isoDate) {
          metadata.isoDate = isoDate;
          metadata.dateType = 'SPECIFIC';
        } else {
          metadata.dateType = 'RELATIVE';
        }

        entities.push({
          id: uuidv4(),
          type: 'DATE',
          text,
          normalized: text.toLowerCase(),
          confidence: isoDate ? 0.95 : 0.75,
          wordIndices,
          timeRanges,
          context,
          metadata,
          source: { transcriptionId, jobId },
          extractedAt: new Date().toISOString(),
        });
      }
    }
  });

  return entities;
}

/**
 * Extract monetary entities
 */
function extractMonetaryEntities(
  words: TranscriptionWord[],
  fullText: string,
  transcriptionId: string,
  jobId: string
): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  MONETARY_PATTERNS.forEach((pattern) => {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(fullText)) !== null) {
      const text = match[0];
      const startPos = match.index;
      const endPos = startPos + text.length;

      const { wordIndices, timeRanges, context } = findWordIndicesForMatch(
        words,
        fullText,
        startPos,
        endPos
      );

      if (wordIndices.length > 0) {
        const amount = parseMonetaryAmount(text);
        const metadata: EntityMetadata = {
          amount,
          currency: 'USD',
        };

        entities.push({
          id: uuidv4(),
          type: 'MONETARY',
          text,
          normalized: amount ? `$${amount.toLocaleString()}` : text,
          confidence: 0.9,
          wordIndices,
          timeRanges,
          context,
          metadata,
          source: { transcriptionId, jobId },
          extractedAt: new Date().toISOString(),
        });
      }
    }
  });

  return entities;
}

/**
 * Extract person entities (names with titles)
 */
function extractPersonEntities(
  words: TranscriptionWord[],
  fullText: string,
  transcriptionId: string,
  jobId: string
): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  PERSON_TITLE_PATTERNS.forEach((pattern) => {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(fullText)) !== null) {
      const text = match[0];
      const startPos = match.index;
      const endPos = startPos + text.length;

      const { wordIndices, timeRanges, context } = findWordIndicesForMatch(
        words,
        fullText,
        startPos,
        endPos
      );

      if (wordIndices.length > 0) {
        const { title, role, credentials } = parsePersonName(text);

        const metadata: EntityMetadata = {};
        if (title) metadata.title = title;
        if (credentials) metadata.credentials = credentials;

        entities.push({
          id: uuidv4(),
          type: 'PERSON',
          text,
          normalized: text.toLowerCase().replace(/\./g, ''),
          role,
          confidence: 0.8,
          wordIndices,
          timeRanges,
          context,
          metadata,
          source: { transcriptionId, jobId },
          extractedAt: new Date().toISOString(),
        });
      }
    }
  });

  return entities;
}

/**
 * Extract location entities
 */
function extractLocationEntities(
  words: TranscriptionWord[],
  fullText: string,
  transcriptionId: string,
  jobId: string
): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  LOCATION_PATTERNS.forEach((pattern) => {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(fullText)) !== null) {
      const text = match[0];
      const startPos = match.index;
      const endPos = startPos + text.length;

      const { wordIndices, timeRanges, context } = findWordIndicesForMatch(
        words,
        fullText,
        startPos,
        endPos
      );

      if (wordIndices.length > 0) {
        const metadata: EntityMetadata = {};
        const lowerText = text.toLowerCase();
        if (lowerText.includes('hospital') || lowerText.includes('clinic')) {
          metadata.addressType = 'MEDICAL_FACILITY';
        }

        entities.push({
          id: uuidv4(),
          type: 'LOCATION',
          text,
          normalized: text.toLowerCase(),
          confidence: 0.8,
          wordIndices,
          timeRanges,
          context,
          metadata,
          source: { transcriptionId, jobId },
          extractedAt: new Date().toISOString(),
        });
      }
    }
  });

  return entities;
}

/**
 * Extract vehicle entities
 */
function extractVehicleEntities(
  words: TranscriptionWord[],
  fullText: string,
  transcriptionId: string,
  jobId: string
): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  VEHICLE_PATTERNS.forEach((pattern) => {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(fullText)) !== null) {
      const text = match[0];
      const startPos = match.index;
      const endPos = startPos + text.length;

      const { wordIndices, timeRanges, context } = findWordIndicesForMatch(
        words,
        fullText,
        startPos,
        endPos
      );

      if (wordIndices.length > 0) {
        const metadata: EntityMetadata = {};
        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) metadata.year = parseInt(yearMatch[0], 10);

        entities.push({
          id: uuidv4(),
          type: 'VEHICLE',
          text,
          normalized: text.toLowerCase(),
          confidence: 0.85,
          wordIndices,
          timeRanges,
          context,
          metadata,
          source: { transcriptionId, jobId },
          extractedAt: new Date().toISOString(),
        });
      }
    }
  });

  return entities;
}

/**
 * Extract measurement entities
 */
function extractMeasurementEntities(
  words: TranscriptionWord[],
  fullText: string,
  transcriptionId: string,
  jobId: string
): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];

  MEASUREMENT_PATTERNS.forEach((pattern) => {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(fullText)) !== null) {
      const text = match[0];
      const startPos = match.index;
      const endPos = startPos + text.length;

      const { wordIndices, timeRanges, context } = findWordIndicesForMatch(
        words,
        fullText,
        startPos,
        endPos
      );

      if (wordIndices.length > 0) {
        const valueMatch = text.match(/(\d+(?:\.\d+)?)/);
        const metadata: EntityMetadata = {};
        if (valueMatch) metadata.value = parseFloat(valueMatch[0]);
        if (match[2]) metadata.unit = match[2];

        entities.push({
          id: uuidv4(),
          type: 'MEASUREMENT',
          text,
          normalized: text.toLowerCase(),
          confidence: 0.9,
          wordIndices,
          timeRanges,
          context,
          metadata,
          source: { transcriptionId, jobId },
          extractedAt: new Date().toISOString(),
        });
      }
    }
  });

  return entities;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find word indices for a text match based on character positions
 */
function findWordIndicesForMatch(
  words: TranscriptionWord[],
  fullText: string,
  startPos: number,
  endPos: number
): {
  wordIndices: number[];
  timeRanges: Array<{ start: number; end: number }>;
  context: string[];
} {
  const wordIndices: number[] = [];
  const timeRanges: Array<{ start: number; end: number }> = [];
  const context: string[] = [];

  let currentPos = 0;
  for (let i = 0; i < words.length; i++) {
    const wordText = words[i].punctuated_word || words[i].word;
    const wordStart = currentPos;
    const wordEnd = currentPos + wordText.length;

    // Check if this word overlaps with the match
    if (wordEnd > startPos && wordStart < endPos) {
      wordIndices.push(i);
      timeRanges.push({ start: words[i].start, end: words[i].end });
    }

    // Capture context (3 words before and after)
    if (i >= wordIndices[0] - 3 && i <= wordIndices[wordIndices.length - 1] + 3) {
      context.push(wordText);
    }

    currentPos = wordEnd + 1; // +1 for space
  }

  return { wordIndices, timeRanges, context };
}

/**
 * Parse a date string into ISO format
 */
function parseDate(dateStr: string): string | null {
  try {
    // Try parsing with Date constructor
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Ignore parse errors
  }

  // Handle MM/DD/YYYY format manually
  const numericMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (numericMatch) {
    const [, month, day, yearMatch] = numericMatch;
    let year = yearMatch;
    if (year.length === 2) {
      year = parseInt(year, 10) < 50 ? `20${year}` : `19${year}`;
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

/**
 * Parse a monetary amount string into a number
 */
function parseMonetaryAmount(amountStr: string): number | undefined {
  // Remove $, commas, and spaces
  const cleaned = amountStr.replace(/[$,\s]/g, '');

  // Handle multipliers
  let multiplier = 1;
  if (/million/i.test(amountStr)) multiplier = 1000000;
  if (/billion/i.test(amountStr)) multiplier = 1000000000;
  if (/thousand/i.test(amountStr)) multiplier = 1000;

  const match = cleaned.match(/(\d+(?:\.\d{2})?)/);
  if (match) {
    return parseFloat(match[0]) * multiplier;
  }

  return undefined;
}

/**
 * Parse person name to extract title, role, and credentials
 */
function parsePersonName(nameStr: string): {
  title?: string;
  role?: EntityRole;
  credentials?: string[];
} {
  const result: { title?: string; role?: EntityRole; credentials?: string[] } = {};

  // Extract title
  const titleMatch = nameStr.match(/\b(Dr|Doctor|Mr|Mrs|Ms|Miss|Attorney|Judge|Physician)\.?/i);
  if (titleMatch) {
    result.title = titleMatch[0];

    // Determine role from title
    if (/dr|doctor|physician/i.test(result.title)) {
      result.role = 'MEDICAL_PROVIDER';
    } else if (/attorney|counselor|lawyer/i.test(result.title)) {
      result.role = 'ATTORNEY';
    }
  }

  // Extract credentials
  const credMatch = nameStr.match(/\b(M\.?D\.?|D\.?O\.?|J\.?D\.?|Ph\.?D\.?|R\.?N\.?|P\.?A\.?)\b/gi);
  if (credMatch) {
    result.credentials = credMatch.map((c) => c.toUpperCase().replace(/\./g, ''));

    // Determine role from credentials if not already set
    if (!result.role) {
      if (result.credentials.some((c) => ['MD', 'DO', 'RN', 'PA'].includes(c))) {
        result.role = 'MEDICAL_PROVIDER';
      } else if (result.credentials.includes('JD')) {
        result.role = 'ATTORNEY';
      }
    }
  }

  return result;
}

/**
 * Deduplicate entities that are very similar
 */
export function deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
  const unique: ExtractedEntity[] = [];
  const seen = new Set<string>();

  for (const entity of entities) {
    // Create a key based on type and normalized text
    const key = `${entity.type}:${entity.normalized}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(entity);
    } else {
      // Merge word indices if duplicate
      const existing = unique.find((e) => `${e.type}:${e.normalized}` === key);
      if (existing) {
        existing.wordIndices.push(...entity.wordIndices);
        existing.timeRanges.push(...entity.timeRanges);
      }
    }
  }

  return unique;
}

/**
 * Group entities by type
 */
export function groupEntitiesByType(
  entities: ExtractedEntity[]
): Record<EntityType, ExtractedEntity[]> {
  const grouped: Record<string, ExtractedEntity[]> = {};

  for (const entity of entities) {
    if (!grouped[entity.type]) {
      grouped[entity.type] = [];
    }
    grouped[entity.type].push(entity);
  }

  return grouped as Record<EntityType, ExtractedEntity[]>;
}

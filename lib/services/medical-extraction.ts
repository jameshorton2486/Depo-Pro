/**
 * Medical Document AI Extraction Service
 * Phase 10 — Depo-Pro
 *
 * Uses Anthropic Claude API to extract structured medical chronology
 * from uploaded PDF documents. Converts unstructured medical records
 * into dated, categorized, source-linked chronology entries.
 *
 * HIPAA Note: Document contents are sent to Claude API for processing.
 * Anthropic's data handling policies apply. No PHI is stored in logs.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MedicalExtractionResult,
  MedicalExtractionEntry,
  CreateChronologyEntryInput,
} from '@/types/medical';
import {
  updateMedicalRecord,
  bulkCreateChronologyEntries,
  deleteChronologyEntriesForRecord,
} from '@/lib/supabase/queries/medical';
import { logger } from '@/lib/logger';

// ── Claude Client ──────────────────────────────────────────────

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  return new Anthropic({ apiKey });
}

// ── Extraction Prompt ──────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are a legal medical records analyst. Your job is to extract a structured chronology from medical documents for use in litigation support.

CRITICAL INSTRUCTIONS:
1. Extract EVERY dated medical event, visit, procedure, test, prescription, or diagnosis.
2. For each entry, provide the most specific date possible. If only a month is known, use the 1st of that month and set date_precision to "MONTH". If only a year, use Jan 1 and set date_precision to "YEAR".
3. Categorize each entry using EXACTLY one of: Visit, Surgery, Imaging, Lab, Prescription, Diagnosis, Therapy, Hospitalization, Consultation, Procedure, Follow-Up, Other.
4. Include page references when identifiable (e.g., "p. 3", "pp. 12-14").
5. Keep summaries concise (one line) but include all clinically relevant details in the details field.
6. Extract provider names and facility names accurately.
7. Set confidence based on how clearly the information was stated in the document (1.0 = explicitly stated, 0.7 = inferred from context, 0.5 = uncertain).
8. For date ranges (e.g., hospitalizations), use event_date for start and event_date_end for end.

RESPOND WITH ONLY valid JSON matching this exact structure (no markdown, no backticks, no preamble):
{
  "document_type": "string - type of medical document (e.g., Hospital Records, Radiology Report, Physical Therapy Notes)",
  "provider_name": "string or null - primary provider name",
  "facility_name": "string or null - primary facility",
  "patient_name": "string or null - patient name if found",
  "date_range_start": "YYYY-MM-DD or null - earliest date in document",
  "date_range_end": "YYYY-MM-DD or null - latest date in document",
  "summary": "string - 1-2 sentence summary of what this document covers",
  "entries": [
    {
      "event_date": "YYYY-MM-DD",
      "event_date_end": "YYYY-MM-DD or null",
      "date_precision": "DAY|MONTH|YEAR",
      "provider": "string or null",
      "category": "Visit|Surgery|Imaging|Lab|Prescription|Diagnosis|Therapy|Hospitalization|Consultation|Procedure|Follow-Up|Other",
      "summary": "string - concise one-line description",
      "details": "string or null - expanded clinical details",
      "page_reference": "string or null - e.g., 'p. 3' or 'pp. 12-14'",
      "confidence": 0.0-1.0
    }
  ]
}`;

// ── Main Extraction Function ───────────────────────────────────

/**
 * Extract medical chronology from a PDF using Claude API.
 *
 * @param pdfBase64 - Base64-encoded PDF content
 * @param fileName - Original file name for context
 * @returns Structured extraction result
 */
export async function extractMedicalChronology(
  pdfBase64: string,
  fileName: string,
): Promise<MedicalExtractionResult> {
  const client = getAnthropicClient();

  logger.info('[medical-extraction] Starting extraction', { fileName });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: `Extract a complete medical chronology from this document: "${fileName}". Return ONLY the JSON structure specified in your instructions.`,
          },
        ],
      },
    ],
  });

  // Extract text response
  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude API');
  }

  // Parse JSON response
  let rawText = textBlock.text.trim();

  // Strip markdown code fences if present
  if (rawText.startsWith('```json')) {
    rawText = rawText.slice(7);
  } else if (rawText.startsWith('```')) {
    rawText = rawText.slice(3);
  }
  if (rawText.endsWith('```')) {
    rawText = rawText.slice(0, -3);
  }
  rawText = rawText.trim();

  let result: MedicalExtractionResult;
  try {
    result = JSON.parse(rawText);
  } catch (parseError) {
    logger.error(
      '[medical-extraction] Failed to parse Claude response',
      parseError instanceof Error ? parseError : new Error(String(parseError)),
      { fileName, rawText: rawText.substring(0, 500) }
    );
    throw new Error(`Failed to parse extraction result: ${parseError}`);
  }

  // Validate structure
  if (!result.entries || !Array.isArray(result.entries)) {
    throw new Error('Extraction result missing entries array');
  }

  // Normalize entries
  result.entries = result.entries
    .filter((e: MedicalExtractionEntry) => e.event_date && e.summary)
    .map((e: MedicalExtractionEntry) => ({
      ...e,
      date_precision: e.date_precision || 'DAY',
      category: e.category || 'Other',
      confidence: typeof e.confidence === 'number' ? Math.min(1, Math.max(0, e.confidence)) : 0.85,
    }));

  logger.info('[medical-extraction] Extraction complete', {
    fileName,
    entriesFound: result.entries.length,
    documentType: result.document_type,
  });

  return result;
}

// ── Full Pipeline: Extract + Store ─────────────────────────────

/**
 * Complete extraction pipeline: reads PDF from storage, sends to Claude,
 * stores results in database.
 *
 * @param supabase - Supabase client
 * @param recordId - Medical record ID
 * @param jobId - Job ID for chronology entries
 * @param actorId - User ID performing extraction
 * @param options - Optional settings
 */
export async function processMedicalRecord(
  supabase: SupabaseClient,
  recordId: string,
  jobId: string,
  actorId: string,
  options?: {
    reprocess?: boolean; // If true, delete existing AI entries first
  },
): Promise<{ entriesCreated: number; result: MedicalExtractionResult }> {
  // 1. Update status to PROCESSING
  const record = await updateMedicalRecord(supabase, recordId, {
    status: 'PROCESSING',
    error_message: null,
  });

  try {
    // 2. Download PDF from Supabase Storage
    const pdfBase64 = await downloadPdfAsBase64(supabase, record.file_url);

    // 3. If reprocessing, delete previous AI-extracted entries
    if (options?.reprocess) {
      const deleted = await deleteChronologyEntriesForRecord(supabase, recordId);
      logger.info('[medical-extraction] Deleted previous entries for reprocessing', {
        recordId,
        deletedCount: deleted,
      });
    }

    // 4. Extract chronology via Claude
    const result = await extractMedicalChronology(pdfBase64, record.file_name);

    // 5. Store extraction metadata on the record
    await updateMedicalRecord(supabase, recordId, {
      status: 'EXTRACTED',
      document_type: result.document_type,
      provider_name: result.provider_name,
      facility_name: result.facility_name,
      patient_name: result.patient_name,
      date_range_start: result.date_range_start,
      date_range_end: result.date_range_end,
      extraction_summary: result.summary,
      extraction_raw_json: result as unknown as Record<string, unknown>,
      processed_at: new Date().toISOString(),
    });

    // 6. Create chronology entries
    const entryInputs: CreateChronologyEntryInput[] = result.entries.map((entry) => ({
      job_id: jobId,
      medical_record_id: recordId,
      event_date: entry.event_date,
      event_date_end: entry.event_date_end || null,
      date_precision: entry.date_precision,
      provider: entry.provider || result.provider_name || null,
      category: entry.category,
      summary: entry.summary,
      details: entry.details || null,
      page_reference: entry.page_reference || null,
      source_type: 'AI_EXTRACTED' as const,
      source_document_name: record.file_name,
      confidence: entry.confidence,
      created_by_id: actorId,
    }));

    const created = await bulkCreateChronologyEntries(supabase, entryInputs);

    logger.info('[medical-extraction] Pipeline complete', {
      recordId,
      jobId,
      entriesCreated: created.length,
    });

    return { entriesCreated: created.length, result };
  } catch (error) {
    // Update record with failure status
    const errorMessage = error instanceof Error ? error.message : 'Unknown extraction error';
    await updateMedicalRecord(supabase, recordId, {
      status: 'FAILED',
      error_message: errorMessage,
    });

    logger.error(
      '[medical-extraction] Pipeline failed',
      error instanceof Error ? error : new Error(String(error)),
      { recordId }
    );

    throw error;
  }
}

// ── Helper: Download PDF from Storage ──────────────────────────

/**
 * Downloads a PDF from Supabase Storage and returns base64-encoded content.
 * Handles both storage paths and signed URLs.
 */
async function downloadPdfAsBase64(
  supabase: SupabaseClient,
  fileUrl: string,
): Promise<string> {
  // If it's a full URL (signed or public), fetch directly
  if (fileUrl.startsWith('http')) {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: HTTP ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }

  // Otherwise, treat as Supabase storage path
  // Expected format: "bucket-name/path/to/file.pdf" or just "path/to/file.pdf"
  let bucket = 'depo-files';
  let path = fileUrl;

  // Check if path includes bucket name
  const knownBuckets = ['depo-files', 'depo-audio', 'depo-exports', 'depo-chunks'];
  for (const b of knownBuckets) {
    if (fileUrl.startsWith(`${b}/`)) {
      bucket = b;
      path = fileUrl.slice(b.length + 1);
      break;
    }
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path);

  if (error) {
    throw new Error(`Failed to download PDF from storage: ${error.message}`);
  }

  const buffer = await data.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

// ── Export for testing ─────────────────────────────────────────

export { downloadPdfAsBase64 as _downloadPdfAsBase64 };

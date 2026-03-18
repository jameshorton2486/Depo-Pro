import { createAdminClient } from '@/lib/supabase/admin';
import { extractText } from './text-extractor';
import { extractDepositionData } from './ai-extractor';
import { writeExtractionToDatabase } from './db-writer';
import type { DepositionExtractionResult } from './types';

export interface IngestionOptions {
  buffer: Buffer;
  mimeType: string;
  originalFileName: string;
  firmId: string;
  uploadedBy: string;
  jobId?: string;
  sourceUrl?: string;
}

export interface IngestionResult {
  success: boolean;
  documentId: string;
  parseStatus: 'complete' | 'partial' | 'failed';
  extraction: DepositionExtractionResult | null;
  caseMetadataId: string | null;
  keywordsAdded: number;
  sessionsFound: number;
  error?: string;
}

export interface ParseDocumentOptions {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  sourceUrl?: string;
}

export interface ParseDocumentResult {
  success: boolean;
  extraction: DepositionExtractionResult | null;
  rawText: string;
  confidence: number;
  sessionsFound: number;
  keywordsFound: number;
  error?: string;
  warnings: string[];
}

export async function parseDocument(options: ParseDocumentOptions): Promise<ParseDocumentResult> {
  const textResult = await extractText(options.buffer, options.mimeType, options.fileName, options.sourceUrl);
  if (!textResult.text.trim()) {
    return {
      success: false,
      extraction: null,
      rawText: '',
      confidence: 0,
      sessionsFound: 0,
      keywordsFound: 0,
      error: textResult.error ?? 'Text extraction produced empty output',
      warnings: textResult.warnings,
    };
  }

  const extraction = await extractDepositionData(textResult.text, options.fileName);

  return {
    success: extraction.confidence > 0,
    extraction,
    rawText: textResult.text,
    confidence: extraction.confidence,
    sessionsFound: extraction.deposition_sessions.length,
    keywordsFound: extraction.transcription_keywords.all_keywords.length,
    warnings: textResult.warnings,
    error: extraction.confidence > 0 ? undefined : extraction.notes ?? textResult.error,
  };
}

export async function ingestDocument(options: IngestionOptions): Promise<IngestionResult> {
  const supabase = createAdminClient();
  let documentId: string | null = null;

  try {
    const filePath = `${options.firmId}/documents/${options.jobId ?? 'unlinked'}/${Date.now()}-${options.originalFileName}`;
    if (options.buffer.length > 0) {
      const { error: uploadError } = await supabase.storage
        .from('depo-files')
        .upload(filePath, options.buffer, { contentType: options.mimeType, upsert: true });

      if (uploadError) {
        throw new Error(uploadError.message);
      }
    }

    const publicUrl = supabase.storage.from('depo-files').getPublicUrl(filePath).data.publicUrl;
    const { data: doc, error: documentError } = await supabase
      .from('deposition_documents')
      .insert({
        firm_id: options.firmId,
        job_id: options.jobId ?? null,
        uploaded_by: options.uploadedBy,
        file_name: options.originalFileName,
        file_url: publicUrl,
        file_size_bytes: options.buffer.length,
        mime_type: options.mimeType,
        source_url: options.sourceUrl ?? null,
        parse_status: 'processing',
      })
      .select('id')
      .single();

    if (documentError || !doc?.id) {
      throw new Error(documentError?.message ?? 'Failed to create deposition document row');
    }
    documentId = doc.id;

    const parsed = await parseDocument({
      buffer: options.buffer,
      mimeType: options.mimeType,
      fileName: options.originalFileName,
      sourceUrl: options.sourceUrl,
    });

    if (!parsed.success || !parsed.extraction) {
      throw new Error(parsed.error ?? 'Document parsing failed');
    }

    const currentDocumentId = documentId as string;
    const writeResult = await writeExtractionToDatabase(
      parsed.extraction,
      currentDocumentId,
      options.firmId,
      options.jobId ?? null,
      options.uploadedBy,
    );

    return {
      success: true,
      documentId: currentDocumentId,
      parseStatus: parsed.confidence >= 0.5 ? 'complete' : 'partial',
      extraction: parsed.extraction,
      caseMetadataId: writeResult.caseMetadataId,
      keywordsAdded: writeResult.keywordsWritten,
      sessionsFound: writeResult.sessionsWritten,
    };
  } catch (error) {
    if (documentId) {
      await supabase
        .from('deposition_documents')
        .update({
          parse_status: 'failed',
          parse_error: error instanceof Error ? error.message : String(error),
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);
    }

    return {
      success: false,
      documentId: documentId ?? '',
      parseStatus: 'failed',
      extraction: null,
      caseMetadataId: null,
      keywordsAdded: 0,
      sessionsFound: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

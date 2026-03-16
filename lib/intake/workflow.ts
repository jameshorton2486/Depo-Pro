import type { SupabaseClient } from '@supabase/supabase-js';
import type { DepositionExtractionResult } from '@/lib/ingestion/types';

export interface IntakeSubmissionPayload {
  jobTitle: string;
  caseName?: string | null;
  caseNumber?: string | null;
  causeNumber?: string | null;
  caseStyle?: string | null;
  deponentName?: string | null;
  depositionDate: string;
  startTime: string;
  timezone?: string | null;
  location?: string | null;
  isRemote?: boolean;
  remotePlatform?: string | null;
  zoomLink?: string | null;
  orderingAttorney?: string | null;
  orderingFirm?: string | null;
  orderingEmail?: string | null;
  orderingPhone?: string | null;
  audioProcessing?: 'automated' | 'forensic';
  notes?: string | null;
  courtName?: string | null;
  courtNumber?: string | null;
  county?: string | null;
  state?: string | null;
  documentId?: string | null;
  extractedData?: DepositionExtractionResult | null;
}

export function mapAudioProcessingMode(
  value: IntakeSubmissionPayload['audioProcessing'],
): 'AUTOMATED' | 'MANUAL_RX' {
  return value === 'forensic' ? 'MANUAL_RX' : 'AUTOMATED';
}

export async function writeKeywords(
  keywords: string[],
  _firmId: string,
  jobId: string,
  supabase: SupabaseClient,
  addedBy: string,
): Promise<void> {
  try {
    if (!keywords.length) return;

    const unique = Array.from(
      new Set(keywords.map((term) => term.trim()).filter(Boolean)),
    );
    if (!unique.length) return;

    const { error } = await supabase.from('custom_vocabularies').insert(
      unique.map((term) => ({
        job_id: jobId,
        term,
        boost: 1.5,
        category: 'intake',
        added_by: addedBy,
      })),
    );

    if (error) {
      console.error('[writeKeywords] non-fatal insert error:', error.message);
    }
  } catch (err) {
    console.error(
      '[writeKeywords] non-fatal exception:',
      err instanceof Error ? err.message : err,
    );
  }
}

export async function createJobFromSubmission(
  supabase: SupabaseClient,
  payload: IntakeSubmissionPayload,
  user: { id: string; role: string; firm_id: string },
  sourceRequestId?: string | null,
) {
  const depositionDateIso = new Date(`${payload.depositionDate}T${payload.startTime}:00`).toISOString();

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      title: payload.jobTitle,
      case_name: payload.caseName ?? payload.jobTitle,
      case_number: payload.caseNumber ?? payload.causeNumber ?? null,
      deposition_date: depositionDateIso,
      location: payload.location ?? null,
      zoom_link: payload.zoomLink ?? null,
      firm_id: user.firm_id,
      created_by_id: user.id,
      created_by_role: user.role,
      reporter_id: user.id,
      notes: payload.notes ?? null,
      audio_processing_mode: mapAudioProcessingMode(payload.audioProcessing),
      status: 'DRAFT',
      source_request_id: sourceRequestId ?? null,
      intake_document_id: payload.documentId ?? null,
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    console.error('[createJobFromSubmission] Supabase insert failed:', {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
    throw new Error(error?.message ?? 'Failed to create job');
  }

  return data.id;
}

export function buildAdminOverrides(
  original: Record<string, unknown>,
  updated: Record<string, unknown>,
): Record<string, { original: unknown; changed_to: unknown }> {
  const overrides: Record<string, { original: unknown; changed_to: unknown }> = {};

  for (const [key, value] of Object.entries(updated)) {
    if (value !== undefined && original[key] !== value) {
      overrides[key] = {
        original: original[key] ?? null,
        changed_to: value,
      };
    }
  }

  return overrides;
}

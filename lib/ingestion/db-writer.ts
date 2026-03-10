import { createAdminClient } from '@/lib/supabase/admin';
import type { DepositionExtractionResult } from './types';

export interface WriteResult {
  caseMetadataId: string;
  partiesWritten: number;
  attorneysWritten: number;
  sessionsWritten: number;
  keywordsWritten: number;
}

function chunkAddress(address: string | null): { line1: string | null; line2: string | null } {
  if (!address) {
    return { line1: null, line2: null };
  }

  const [line1, ...rest] = address.split(',').map((part) => part.trim()).filter(Boolean);
  return {
    line1: line1 || null,
    line2: rest.length ? rest.join(', ') : null,
  };
}

export async function writeExtractionToDatabase(
  extraction: DepositionExtractionResult,
  documentId: string,
  firmId: string,
  jobId: string | null,
): Promise<WriteResult> {
  const supabase = createAdminClient();

  const { data: caseMetadata, error: caseMetadataError } = await supabase
    .from('case_metadata')
    .insert({
      firm_id: firmId,
      job_id: jobId,
      document_id: documentId,
      cause_number: extraction.case_information.cause_number,
      case_style: extraction.case_information.case_style,
      court_name: extraction.case_information.court_name,
      court_number: extraction.case_information.court_number,
      county: extraction.case_information.county,
      state: extraction.case_information.state ?? 'Texas',
      court_reporter_firm: extraction.court_reporter.firm,
      court_reporter_name: extraction.court_reporter.name,
      raw_extraction: extraction,
      confidence_score: extraction.confidence,
    })
    .select('id')
    .single();

  if (caseMetadataError || !caseMetadata?.id) {
    throw new Error(caseMetadataError?.message ?? 'Failed to write case metadata');
  }

  const caseMetadataId = caseMetadata.id;
  const deponentNames = new Set(extraction.deposition_sessions.map((session) => session.deponent_name.toLowerCase()));

  const parties = [
    ...extraction.parties.plaintiffs.map((party_name) => ({ party_name, party_type: 'plaintiff' })),
    ...extraction.parties.defendants.map((party_name) => ({ party_name, party_type: 'defendant' })),
    ...extraction.parties.third_parties.map((party_name) => ({ party_name, party_type: 'third_party' })),
  ].filter((party) => party.party_name.trim().length > 0);

  if (parties.length) {
    const { error } = await supabase.from('case_parties').insert(
      parties.map((party) => ({
        firm_id: firmId,
        case_metadata_id: caseMetadataId,
        party_name: party.party_name,
        party_type: party.party_type,
        is_deponent: deponentNames.has(party.party_name.toLowerCase()),
      })),
    );

    if (error) {
      throw new Error(`Failed to write case parties: ${error.message}`);
    }
  }

  if (extraction.attorneys.length) {
    const { error } = await supabase.from('case_attorneys').insert(
      extraction.attorneys.map((attorney) => {
        const address = chunkAddress(attorney.address);
        return {
          firm_id: firmId,
          case_metadata_id: caseMetadataId,
          attorney_name: attorney.name,
          law_firm: attorney.firm,
          role: attorney.role,
          represents: attorney.represents,
          address_line1: address.line1,
          address_line2: address.line2,
          city: attorney.city,
          state: attorney.state,
          postal_code: attorney.postal_code,
          phone: attorney.phone,
          fax: attorney.fax,
          email: attorney.email,
          delivery_format: attorney.delivery_format,
          is_rush: attorney.is_rush,
        };
      }),
    );

    if (error) {
      throw new Error(`Failed to write case attorneys: ${error.message}`);
    }
  }

  if (extraction.deposition_sessions.length) {
    const { error } = await supabase.from('deposition_sessions').insert(
      extraction.deposition_sessions.map((session) => ({
        firm_id: firmId,
        case_metadata_id: caseMetadataId,
        job_id: jobId,
        deponent_name: session.deponent_name,
        deposition_date: session.deposition_date,
        start_time: session.start_time,
        location: session.location,
        timezone: 'America/Chicago',
        is_remote: session.is_remote,
        remote_platform: session.remote_platform,
        remote_link: session.zoom_link,
        is_videotaped: session.is_videotaped,
        includes_duces_tecum: session.includes_duces_tecum,
      })),
    );

    if (error) {
      throw new Error(`Failed to write deposition sessions: ${error.message}`);
    }
  }

  const keywords = Array.from(
    new Set(extraction.transcription_keywords.all_keywords.map((keyword) => keyword.trim()).filter(Boolean)),
  );

  if (keywords.length) {
    const { error } = await supabase.from('vocabulary_terms').upsert(
      keywords.map((term) => ({
        firm_id: firmId,
        job_id: jobId,
        term,
        source: 'document_ingestion',
        boost_factor: 1.5,
      })),
      {
        onConflict: 'firm_id,term',
        ignoreDuplicates: false,
      },
    );

    if (error) {
      throw new Error(`Failed to write vocabulary keywords: ${error.message}`);
    }
  }

  if (jobId) {
    const { error } = await supabase
      .from('jobs')
      .update({ case_metadata_id: caseMetadataId, intake_document_id: documentId })
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to link job to case metadata: ${error.message}`);
    }
  }

  const { error: documentError } = await supabase
    .from('deposition_documents')
    .update({
      parse_status: extraction.confidence >= 0.5 ? 'complete' : 'partial',
      extraction_id: caseMetadataId,
      document_type: extraction.document_type,
      parsed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (documentError) {
    throw new Error(`Failed to update deposition document row: ${documentError.message}`);
  }

  return {
    caseMetadataId,
    partiesWritten: parties.length,
    attorneysWritten: extraction.attorneys.length,
    sessionsWritten: extraction.deposition_sessions.length,
    keywordsWritten: keywords.length,
  };
}
